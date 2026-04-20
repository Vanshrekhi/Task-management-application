import { useSelector } from "react-redux";
import AdminDashboard from "./AdminDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  // Admin ko Admin Dashboard, Employee ko Employee Dashboard
  return user?.isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
};

export default Dashboard;