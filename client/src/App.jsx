import { Transition } from "@headlessui/react";
import { Fragment, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { Navbar, Sidebar } from "./components";
import {
  Dashboard,
  AdminDashboard,
  EmployeeDashboard,
  FacultyDashboard,
  HodDashboard,
  ChatRoom,
  Login,
  StudentDashboard,
  TaskDetail,
  Tasks,
  Trash,
  Users,
} from "./pages";
import Register from "./pages/Register"; // 👈 Register import
import { setOpenSidebar } from "./redux/slices/authSlice";
import NotificationToasts from "./components/NotificationToasts";

function Layout() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    return <Navigate to='/log-in' state={{ from: location }} replace />;
  }

  return (
    <div className='w-full h-screen flex flex-col md:flex-row'>
      <div className='w-1/5 h-screen bg-white dark:bg-[#1f1f1f] sticky top-0 hidden md:block'>
        <Sidebar />
      </div>

      <MobileSidebar />

      <div className='flex-1 overflow-y-auto'>
        <Navbar />
        <NotificationToasts />

        <div className='p-4 2xl:px-10'>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const RootRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;
  const isAdmin = user?.isAdmin || role === "Principal";
  return user ? (
    <Navigate
      to={
        isAdmin
          ? "/admin-dashboard"
          : role === "HOD"
            ? "/hod-dashboard"
            : role === "Faculty"
              ? "/faculty-dashboard"
              : role === "Student"
                ? "/student-dashboard"
                : "/employee-dashboard"
      }
      replace
    />
  ) : (
    <Navigate to='/log-in' replace />
  );
};

const MobileSidebar = () => {
  const { isSidebarOpen } = useSelector((state) => state.auth);
  const mobileMenuRef = useRef(null);
  const dispatch = useDispatch();

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  return (
    <>
      <Transition
        show={isSidebarOpen}
        as={Fragment}
        enter='transition-opacity duration-700'
        enterFrom='opacity-x-10'
        enterTo='opacity-x-100'
        leave='transition-opacity duration-700'
        leaveFrom='opacity-x-100'
        leaveTo='opacity-x-0'
      >
        {(ref) => (
          <div
            ref={(node) => (mobileMenuRef.current = node)}
            className={`md:hidden w-full h-full bg-black/40 transition-transform duration-700 transform
             ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            onClick={() => closeSidebar()}
          >
            <div className='bg-white w-3/4 h-full'>
              <div className='w-full flex justify-end px-5 pt-5'>
                <button
                  onClick={() => closeSidebar()}
                  className='flex justify-end items-end'
                >
                  <IoMdClose size={25} />
                </button>
              </div>

              <div className='-mt-10'>
                <Sidebar />
              </div>
            </div>
          </div>
        )}
      </Transition>
    </>
  );
};

const App = () => {
  const theme = "light";

  return (
    <main className={theme}>
      <div className='w-full min-h-screen bg-[#f3f4f6] dark:bg-[#0d0d0df4]'>
        <Routes>
          <Route element={<Layout />}>
            <Route index path='/' element={<RootRedirect />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/admin-dashboard' element={<AdminDashboard />} />
            <Route path='/hod-dashboard' element={<HodDashboard />} />
            <Route path='/faculty-dashboard' element={<FacultyDashboard />} />
            <Route path='/student-dashboard' element={<StudentDashboard />} />
            <Route path='/employee-dashboard' element={<EmployeeDashboard />} />
            <Route path='/tasks' element={<Tasks />} />
            <Route path='/completed/:status?' element={<Tasks />} />
            <Route path='/in-progress/:status?' element={<Tasks />} />
            <Route path='/todo/:status?' element={<Tasks />} />
            <Route path='/trashed' element={<Trash />} />
            <Route path='/task/:id' element={<TaskDetail />} />
            <Route path='/team' element={<Users />} />
            <Route path='/chat' element={<ChatRoom />} />
          </Route>

          <Route path='/log-in' element={<Login />} />
          <Route path='/register' element={<Register />} /> {/* 👈 New route */}
        </Routes>
      </div>

      <Toaster richColors position='top-center' />
      <HotToaster position='top-right' />
    </main>
  );
};

export default App;