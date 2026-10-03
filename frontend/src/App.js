import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home/Home';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import UserDashboard from './components/Dashboard/UserDashboard';
import CreatePlanner from './components/CreatePlanner/CreatePlanner';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/create-planner" element={<CreatePlanner />} />
      </Routes>
    </div>
  );
}

export default App;