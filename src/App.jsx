import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GetStarted from './pages/GetStarted';
import Login from './pages/Login';
import LecturerDashboard from './pages/DashLecturer';
import CourseRepDashboard from './pages/DashRep';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GetStarted/>} />
          <Route path="/Login" element={<Login />} />
            <Route path="/lec" element={<LecturerDashboard />} />
            <Route path="/rep" element={<CourseRepDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
