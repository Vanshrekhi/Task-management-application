import { useMemo } from "react";
import { toast } from "sonner";
import {
  useApproveUserMutation,
  useGetPendingRequestsQuery,
  useRejectUserMutation,
} from "../redux/slices/api/userApiSlice";

const Field = ({ label, value }) => (
  <div className='text-xs leading-4'>
    <span className='text-gray-500'>{label}</span>
    <span className='ml-1 text-gray-900'>{value || "-"}</span>
  </div>
);

export default function PendingApprovalsPanel({ title = "Pending approvals" }) {
  const { data, isLoading, refetch } = useGetPendingRequestsQuery();
  const [approveUser, { isLoading: approving }] = useApproveUserMutation();
  const [rejectUser, { isLoading: rejecting }] = useRejectUserMutation();

  const users = useMemo(() => data?.users || [], [data]);

  const busy = isLoading || approving || rejecting;

  const handleApprove = async (id) => {
    try {
      const res = await approveUser(id).unwrap();
      toast.success(res?.message || "Approved");
      refetch();
    } catch (e) {
      toast.error(e?.data?.message || e?.error || "Approve failed");
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await rejectUser(id).unwrap();
      toast.success(res?.message || "Rejected");
      refetch();
    } catch (e) {
      toast.error(e?.data?.message || e?.error || "Reject failed");
    }
  };

  return (
    <div className='w-full bg-white rounded-md shadow-sm border border-gray-200'>
      <div className='px-3 py-2 flex items-center justify-between border-b border-gray-100'>
        <p className='text-sm font-semibold text-gray-800'>{title}</p>
        <button
          type='button'
          onClick={() => refetch()}
          className='text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50'
          disabled={busy}
        >
          Refresh
        </button>
      </div>

      <div className='p-2'>
        {isLoading ? (
          <p className='text-xs text-gray-500 px-1'>Loading…</p>
        ) : users.length === 0 ? (
          <p className='text-xs text-gray-500 px-1'>No pending requests.</p>
        ) : (
          <div className='flex flex-col gap-2'>
            {users.map((u) => (
              <div
                key={u._id}
                className='p-2 rounded border border-gray-200 flex flex-col gap-2'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-gray-900 truncate'>
                      {u.name}
                    </p>
                    <p className='text-xs text-gray-600'>
                      {u.role}
                      {u.department ? ` • ${u.department}` : ""}
                    </p>
                  </div>

                  <div className='flex gap-1 shrink-0'>
                    <button
                      type='button'
                      className='text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'
                      onClick={() => handleApprove(u._id)}
                      disabled={busy}
                    >
                      Approve
                    </button>
                    <button
                      type='button'
                      className='text-xs px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60'
                      onClick={() => handleReject(u._id)}
                      disabled={busy}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1'>
                  <Field label='Email' value={u.email} />
                  <Field label='PRN' value={u.prn} />
                  <Field label='Year' value={u.year} />
                  <Field label='Section' value={u.section} />
                  <Field label='Roll No' value={u.rollNo} />
                  <Field label='Faculty role' value={u.facultyRole} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

