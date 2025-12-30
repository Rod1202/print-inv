import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import { useGitHub } from './hooks/useGithub';
import localData from '../inventario.json'; // Fallback para desarrollo local

function App() {
  const [user, setUser] = useState(null);
  const [localInventory, setLocalInventory] = useState([]);
  const { getInventory } = useGitHub();

  // Al iniciar sesión, descargamos TODO el inventario de GitHub una sola vez
  const handleLogin = async (username) => {
    try {
      const { content } = await getInventory();
      // Si hay contenido remoto, lo usamos. Si está vacío (o error), usamos local.
      setLocalInventory(content && content.length > 0 ? content : localData);
    } catch (error) {
      console.warn("No se pudo obtener inventario de GitHub, usando datos locales:", error);
      setLocalInventory(localData);
    }
    setUser(username);
  };

  return (
    <div className="min-h-screen bg-background-light">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Inventory
          user={user}
          inventoryData={localInventory}
          setInventoryData={setLocalInventory}
        />
      )}
    </div>
  );
}

export default App;