import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  useGetNotificationsQuery,
  useMarkNotiAsReadMutation,
} from "../redux/slices/api/userApiSlice";

function toastForNotice(n) {
  const title =
    n?.text?.includes("overdue") || n?.text?.includes("Overdue")
      ? "⚠️ Task Overdue"
      : n?.text?.includes("Deadline near")
        ? "⏰ Deadline Near"
        : n?.text?.includes("Reminder")
          ? "🔔 Task Reminder"
          : "🔔 Notification";

  const description = n?.task?.title ? `"${n.task.title}"` : n?.text || "";

  toast.custom(
    (t) => (
      <div
        className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black/5 p-4 ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className='flex items-start gap-3'>
          <div className='flex-1'>
            <p className='text-sm font-semibold text-gray-900'>{title}</p>
            <p className='mt-1 text-sm text-gray-600 line-clamp-2'>{description}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className='text-gray-400 hover:text-gray-700 text-sm'
          >
            ✕
          </button>
        </div>
      </div>
    ),
    { duration: 4500 }
  );
}

export default function NotificationToasts() {
  const shownIds = useRef(new Set());

  const { data } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [markAsRead] = useMarkNotiAsReadMutation();

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    const unseen = data.filter((n) => n?._id && !shownIds.current.has(n._id));
    if (unseen.length === 0) return;

    for (const n of unseen) {
      shownIds.current.add(n._id);
      toastForNotice(n);
      markAsRead({ type: "one", id: n._id }).catch(() => {});
    }
  }, [data, markAsRead]);

  return null;
}

