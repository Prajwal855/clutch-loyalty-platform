import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import  SignupPage  from "./components/auth/SignupPage";
import LoginPage from "./components/auth/LoginPage";
import Dashboard from "./components/feat/DashboardPage";


function App() {
  return (
    <Routes>
      <Route path="/" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/dashboard" element={<Dashboard/>} />
    </Routes>
  );
}

export default App;
