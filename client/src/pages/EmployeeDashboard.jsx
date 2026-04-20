import clsx from "clsx";
import moment from "moment";
import { useEffect } from "react";
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
  MdTaskAlt,
  MdOutlinePendingActions,
} from "react-icons/md";
import { FaNewspaper } from "react-icons/fa";
import { FaArrowsToDot } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loading } from "../components";
import { useGetDasboardStatsQuery } from "../redux/slices/api/taskApiSlice";
import { useChangeTaskStageMutation } from "../redux/slices/api/taskApiSlice";
import { TASK_TYPE, PRIOTITYSTYELS, getInitials } from "../utils";

const ICONS = {
  high: <MdKeyboardDoubleArrowUp />,
  medium: <MdKeyboardArrowUp />,
  low: <MdKeyboardArrowDown />,
};

const STAGE_LABELS = {
  todo: { label: "To Do", color: "bg-blue-100 text-blue-700" },
  "in progress": { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

const EmployeeDashboard = () => {
  const { data, isLoading, refetch } = useGetDasboardStatsQuery();
  const [changeStage] = useChangeTaskStageMutation();
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  if (isLoading)
    return <div className="py-10"><Loading /></div>;

  const myTasks = data?.last10Task || [];
  const totals = data?.tasks || {};

  const stats = [
    { label: "MY TOTAL TASKS", total: data?.totalTasks || 0, icon: <FaNewspaper />, bg: "bg-[#1d4ed8]" },
    { label: "COMPLETED", total: totals["completed"] || 0, icon: <MdTaskAlt />, bg: "bg-[#0f766e]" },
    { label: "IN PROGRESS", total: totals["in progress"] || 0, icon: <MdOutlinePendingActions />, bg: "bg-[#f59e0b]" },
    { label: "TO DO", total: totals["todo"] || 0, icon: <FaArrowsToDot />, bg: "bg-[#be185d]" },
  ];

  const handleMarkComplete = async (taskId) => {
    try {
      await changeStage({ id: taskId, stage: "completed" }).unwrap();
      toast.success("Task marked as completed! ✅");
      refetch();
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const handleMarkInProgress = async (taskId) => {
    try {
      await changeStage({ id: taskId, stage: "in progress" }).unwrap();
      toast.success("Task marked as In Progress 🔄");
      refetch();
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="h-full py-4">
      {/* Welcome Banner */}
      <div className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}! 👋</h2>
          <p className="text-blue-100 mt-1">
            You have <span className="font-bold text-white">{totals["todo"] || 0} pending</span> tasks and{" "}
            <span className="font-bold text-white">{totals["in progress"] || 0} in progress</span>
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-blue-200 text-sm">{user?.title}</p>
          <p className="text-blue-300 text-xs">{user?.role}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ icon, bg, label, total }, index) => (
          <div key={index} className="w-full bg-white p-4 shadow-md rounded-md flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <span className="text-2xl font-bold">{total}</span>
            </div>
            <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm", bg)}>
              {icon}
            </div>
          </div>
        ))}
      </div>

      {/* My Tasks Table */}
      <div className="w-full bg-white px-4 pt-4 pb-6 shadow-md rounded">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">My Assigned Tasks</h3>
          <button
            onClick={() => navigate("/tasks")}
            className="text-sm text-blue-600 hover:underline"
          >
            View All →
          </button>
        </div>

        {myTasks.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <MdTaskAlt className="text-5xl mx-auto mb-2 text-gray-300" />
            <p>No tasks assigned to you yet!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-gray-600 text-sm">
                  <th className="py-2 pr-4">Task</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Due Date</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.map((task) => (
                  <tr
                    key={task._id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* Task Title */}
                    <td className="py-3 pr-4">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => navigate(`/task/${task._id}`)}
                      >
                        <div className={clsx("w-3 h-3 rounded-full flex-shrink-0", TASK_TYPE[task.stage])} />
                        <p className="text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1">
                          {task?.title}
                        </p>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 pr-4">
                      <div className="flex gap-1 items-center">
                        <span className={clsx("text-base", PRIOTITYSTYELS[task?.priority])}>
                          {ICONS[task?.priority]}
                        </span>
                        <span className="capitalize text-xs text-gray-600">{task?.priority}</span>
                      </div>
                    </td>

                    {/* Stage Badge */}
                    <td className="py-3 pr-4">
                      <span className={clsx(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        STAGE_LABELS[task.stage]?.color
                      )}>
                        {STAGE_LABELS[task.stage]?.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 pr-4 text-xs text-gray-500">
                      {moment(task?.date).format("DD MMM YYYY")}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3">
                      <div className="flex gap-2">
                        {task.stage === "todo" && (
                          <button
                            onClick={() => handleMarkInProgress(task._id)}
                            className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition"
                          >
                            Start
                          </button>
                        )}
                        {task.stage === "in progress" && (
                          <button
                            onClick={() => handleMarkComplete(task._id)}
                            className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                          >
                            ✓ Complete
                          </button>
                        )}
                        {task.stage === "completed" && (
                          <span className="text-xs px-3 py-1 bg-green-50 text-green-500 rounded-full">
                            ✓ Done
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;