import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';

function App() {

  const router = createBrowserRouter([
    {
      path: "/",
      element: <LoginPage />,
      errorElement: <div>404</div>
    },
    {
      path: "/register",
      element: <LoginPage />,
      errorElement: <div>404</div>
    },
  ])

  return <RouterProvider router={router} /> 
}

export default App;
