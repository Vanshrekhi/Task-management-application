import clsx from "clsx";
import moment from "moment";
import { useEffect } from "react";
import { FaNewspaper, FaUsers } from "react-icons/fa";
import { FaArrowsToDot } from "react-icons/fa6";
import { LuClipboardEdit } from "react-icons/lu";
import {
  MdAdminPanelSettings,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
  MdOutlineAddTask,
} from "react-icons/md";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Chart, Loading, UserInfo } from "../components";
import { useGetDasboardStatsQuery } from "../redux/slices/api/taskApiSlice";
import { BGS, PRIOTITYSTYELS, TASK_TYPE, getInitials } from "../utils";

const StatCard = ({ label, count, bg, icon }) => (
  <div className="w-full h-32 bg-white p-5 shadow-md rounded-md flex items-center justify-between">
    <div className="h-full flex flex-1 flex-col justify-between">
      <p className="text-base text-gray-600">{label}</p>
      <span className="text-2xl font-semibold">{count}</span>
      <span className="text-sm text-gray-400">Total count</span>
    </div>
    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white", bg)}>
      {icon}
    </div>
  </div>
);

const ICONS = {
  high: <MdKeyboardDoubleArrowUp />,
  medium: <MdKeyboardArrowUp />,
  low: <MdKeyboardArrowDown />,
};

const AdminDashboard = () => {
  const { data, isLoading } = useGetDasboardStatsQuery();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  if (isLoading)
    return <div className="py-10"><Loading /></div>;

  const totals = data?.tasks || {};

  const stats = [
    { label: "TOTAL TASKS", total: data?.totalTasks || 0, icon: <FaNewspaper />, bg: "bg-[#1d4ed8]" },
    { label: "COMPLETED", total: totals["completed"] || 0, icon: <MdAdminPanelSettings />, bg: "bg-[#0f766e]" },
    { label: "IN PROGRESS", total: totals["in progress"] || 0, icon: <LuClipboardEdit />, bg: "bg-[#f59e0b]" },
    { label: "TO DO", total: totals["todo"] || 0, icon: <FaArrowsToDot />, bg: "bg-[#be185d]" },
  ];

  return (
    <div className="h-full py-4">
      {/* Welcome Banner */}
      <div className="w-full bg-blue-700 text-white rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard 👑</h2>
          <p className="text-blue-200 mt-1">Manage your team and assign tasks from here</p>
        </div>
        <MdAdminPanelSettings className="text-6xl text-blue-300" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {stats.map(({ icon, bg, label, total }, index) => (
          <StatCard key={index} icon={icon} bg={bg} label={label} count={total} />
        ))}
      </div>

      {/* Chart */}
      <div className="w-full bg-white my-6 p-4 rounded shadow-sm">
        <h4 className="text-xl text-gray-500 font-bold mb-2">Tasks by Priority</h4>
        <Chart data={data?.graphData} />
      </div>

      {/* Tables Row */}
      <div className="w-full flex flex-col md:flex-row gap-4 2xl:gap-10 py-4">
        {/* Recent Tasks */}
        <div className="w-full md:w-2/3 bg-white px-4 pt-4 pb-4 shadow-md rounded">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-700">Recent Tasks</h3>
            <button
              onClick={() => navigate("/tasks")}
              className="text-sm text-blue-600 hover:underline"
            >
              View All →
            </button>
          </div>
          <table className="w-full">
            <thead className="border-b border-gray-300">
              <tr className="text-left text-black">
                <th className="py-2">Task Title</th>
                <th className="py-2">Priority</th>
                <th className="py-2">Team</th>
                <th className="py-2 hidden md:block">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.last10Task?.map((task, id) => (
                <tr
                  key={task?._id + id}
                  className="border-b border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/task/${task._id}`)}
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-4 h-4 rounded-full", TASK_TYPE[task.stage])} />
                      <p className="text-sm text-black">{task?.title}</p>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1 items-center">
                      <span className={clsx("text-lg", PRIOTITYSTYELS[task?.priority])}>
                        {ICONS[task?.priority]}
                      </span>
                      <span className="capitalize text-sm">{task?.priority}</span>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex">
                      {task?.team?.map((m, index) => (
                        <div
                          key={index}
                          className={clsx(
                            "w-7 h-7 rounded-full text-white flex items-center justify-center text-xs -mr-1",
                            BGS[index % BGS?.length]
                          )}
                        >
                          <UserInfo user={m} />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 hidden md:block">
                    <span className="text-sm text-gray-500">{moment(task?.date).fromNow()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Team Members */}
        <div className="w-full md:w-1/3 bg-white px-4 pt-4 pb-4 shadow-md rounded">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-700">
              <FaUsers className="inline mr-2 text-blue-600" />
              Team Members
            </h3>
            <button
              onClick={() => navigate("/team")}
              className="text-sm text-blue-600 hover:underline"
            >
              Manage →
            </button>
          </div>
          <table className="w-full">
            <thead className="border-b border-gray-300">
              <tr className="text-left text-black">
                <th className="py-2">Name</th>
                <th className="py-2">Status</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((user, index) => (
                <tr
                  key={index + user?._id}
                  className="border-b border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs bg-violet-700">
                        {getInitials(user?.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2">
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-xs",
                      user?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    )}>
                      {user?.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">{moment(user?.createdAt).fromNow()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;