import './App.css'
import React, { useState, useEffect } from 'react';


function App() {
  const [response, setResponse] = useState([]);

  useEffect(async () => {
    const getToken = async () => {
      return await fetch("http://localhost:8080/wcl-token")
    }
    const hitWCL = async (token) => {
      return await fetch("http://localhost:8080/test-wcl", {headers: token})
    }

    const token = await getToken()
    setResponse( [await hitWCL(token)] )
    console.log(response)
  }, [setResponse])


  return (
    <div className="App">
    </div>
  );
}

export default App
