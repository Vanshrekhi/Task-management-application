import clsx from "clsx";
import { FaTasks, FaTrashAlt, FaUsers } from "react-icons/fa";
import {
  MdDashboard,
  MdOutlineAddTask,
  MdOutlinePendingActions,
  MdSettings,
  MdTaskAlt,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar } from "../redux/slices/authSlice";

// Admin ke liye poore links
const adminLinks = [
  { label: "Dashboard", link: "dashboard", icon: <MdDashboard /> },
  { label: "All Tasks", link: "tasks", icon: <FaTasks /> },
  { label: "Completed", link: "completed/completed", icon: <MdTaskAlt /> },
  { label: "In Progress", link: "in-progress/in progress", icon: <MdOutlinePendingActions /> },
  { label: "To Do", link: "todo/todo", icon: <MdOutlinePendingActions /> },
  { label: "Team", link: "team", icon: <FaUsers /> },
  { label: "Trash", link: "trashed", icon: <FaTrashAlt /> },
];

// Employee ke liye sirf apne kaam ke links
const employeeLinks = [
  { label: "My Dashboard", link: "dashboard", icon: <MdDashboard /> },
  { label: "My Tasks", link: "tasks", icon: <FaTasks /> },
  { label: "Completed", link: "completed/completed", icon: <MdTaskAlt /> },
  { label: "In Progress", link: "in-progress/in progress", icon: <MdOutlinePendingActions /> },
  { label: "To Do", link: "todo/todo", icon: <MdOutlinePendingActions /> },
];

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const path = location.pathname.split("/")[1];

  const sidebarLinks = user?.isAdmin ? adminLinks : employeeLinks;

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  const NavLink = ({ el }) => (
    <Link
      onClick={closeSidebar}
      to={el.link}
      className={clsx(
        "w-full lg:w-3/4 flex gap-2 px-3 py-2 rounded-full items-center text-gray-800 dark:text-gray-400 text-base hover:bg-[#2564ed2d]",
        path === el.link.split("/")[0] ? "bg-blue-700 text-white" : ""
      )}
    >
      {el.icon}
      <span className="hover:text-[#2564ed]">{el.label}</span>
    </Link>
  );

  return (
    <div className="w-full h-full flex flex-col gap-6 p-5">
      {/* Logo */}
      <h1 className="flex gap-1 items-center">
        <p className="bg-blue-600 p-2 rounded-full">
          <MdOutlineAddTask className="text-white text-2xl font-black" />
        </p>
        <span className="text-2xl font-bold text-black dark:text-white">Taskify</span>
      </h1>

      {/* Role Badge */}
      <div className={clsx(
        "px-3 py-1 rounded-full text-xs font-semibold w-fit",
        user?.isAdmin
          ? "bg-blue-100 text-blue-700"
          : "bg-violet-100 text-violet-700"
      )}>
        {user?.isAdmin ? "👑 Admin" : "👤 Employee"}
      </div>

      {/* Nav Links */}
      <div className="flex-1 flex flex-col gap-y-5 py-4">
        {sidebarLinks.map((link) => (
          <NavLink el={link} key={link.label} />
        ))}
      </div>

      {/* Settings */}
      <div>
        <button className="w-full flex gap-2 p-2 items-center text-lg text-gray-800 dark:text-white">
          <MdSettings />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;