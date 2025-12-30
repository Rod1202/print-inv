import React, { useState } from 'react';
import users from '../../user.json';

import logo from '../assets/logoICO.svg';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        // Validación local con user.json
        const userFound = users.find(u => u.username === username && u.password === password);

        if (!userFound) {
            alert("Usuario o contraseña incorrectos.");
            return;
        }

        setIsLoggingIn(true);
        try {
            // Llamamos a la función onLogin que viene de App.jsx
            // Esta función hará el fetch inicial a GitHub
            await onLogin(username);
        } catch (error) {
            alert("Error al conectar con el servidor.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-xl">
            <div className="h-12 w-full bg-transparent"></div>

            {/* HEADER / BANNER */}
            <div className="@container w-full px-4 pt-2 pb-6">
                <div
                    className="relative flex flex-col justify-end overflow-hidden rounded-2xl min-h-[260px] bg-cover bg-center shadow-lg group"
                    style={{
                        backgroundImage: `linear-gradient(180deg, rgba(0, 102, 255, 0.2) 0%, rgba(15, 23, 35, 0.6) 100%), url(${logo})`
                    }}
                >
                    <div className="absolute top-6 left-6 flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-sm p-1.5">
                            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-white font-bold text-sm tracking-wide bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
                            Inventario
                        </span>
                    </div>
                    <div className="flex flex-col p-6 relative z-10">
                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">Inv. APP</p>
                        <h1 className="text-white tracking-tight text-4xl font-bold leading-tight drop-shadow-sm">Bienvenido</h1>
                    </div>
                </div>
            </div>

            {/* FORMULARIO */}
            <div className="flex flex-1 flex-col px-6 -mt-2">
                <div className="pb-6 pt-2">
                    <h2 className="text-slate-800 dark:text-white tracking-tight text-[26px] font-bold leading-tight">
                        Registro de<br />
                        <span className="text-primary">Inventario</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                        Ingresa tus credenciales para gestionar el inventario.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* USUARIO */}
                    <label className="flex flex-col gap-2 group">
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal ml-1">
                            Nombre de Usuario
                        </span>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">
                                <span className="material-symbols-outlined">person</span>
                            </span>
                            <input
                                required
                                className="form-input flex w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-14 pl-12 pr-4 text-base font-normal placeholder:text-slate-400 transition-all shadow-sm"
                                placeholder=""
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </label>

                    {/* CONTRASEÑA */}
                    <label className="flex flex-col gap-2 group">
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal ml-1">
                            Contraseña
                        </span>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">
                                <span className="material-symbols-outlined">lock</span>
                            </span>
                            <input
                                required
                                className="form-input flex w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-14 pl-12 pr-12 text-base font-normal placeholder:text-slate-400 transition-all shadow-sm"
                                placeholder="••••••••"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {showPassword ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                        </div>
                    </label>

                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className={`flex w-full cursor-pointer items-center justify-center rounded-xl h-14 px-6 ${isLoggingIn ? 'bg-slate-400' : 'bg-primary hover:bg-blue-600'} active:scale-[0.98] text-white text-base font-bold tracking-wide transition-all shadow-md shadow-primary/20 mt-4`}
                    >
                        <span className="truncate">{isLoggingIn ? 'SINCRONIZANDO...' : 'INGRESAR'}</span>
                        <span className="material-symbols-outlined ml-2 text-[20px]">
                            {isLoggingIn ? 'sync' : 'arrow_forward'}
                        </span>
                    </button>
                </form>

                <div className="mt-auto py-8 flex flex-col items-center justify-center gap-4">
                    <button className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium">
                        <span className="material-symbols-outlined text-[18px]">help</span>
                        Power by Rodrigo Carbonel
                    </button>
                    <div className="h-1 w-1/3 bg-slate-200 dark:bg-slate-700 rounded-full mt-4"></div>
                </div>
            </div>
        </div>
    );
};

export default Login;