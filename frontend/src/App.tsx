import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import  SignupPage  from "./components/auth/SignupPage";
import LoginPage from "./components/auth/LoginPage";


function App() {
  return (
    <Routes>
      <Route path="/" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage/>}/>
    </Routes>
  );
}

export default App;
