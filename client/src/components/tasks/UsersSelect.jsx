import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md";
import { useSelector } from "react-redux";
import { useGetTeamListsQuery } from "../../redux/slices/api/userApiSlice.js";
import { DEPARTMENTS, getInitials, YEARS } from "../../utils/index.js";

export default function UserList({ team, setTeam }) {
  const { user: me } = useSelector((state) => state.auth);
  const isPrincipal = me?.isAdmin || me?.role === "Principal";

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");

  const deptForSection = isPrincipal ? dept : me?.department || "";

  const { data = [], isFetching } = useGetTeamListsQuery({
    search,
    department: isPrincipal ? dept : "",
    year,
    section: deptForSection === "COMP" && section ? section : "",
  });

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const filtered = useMemo(() => data, [data]);

  useEffect(() => {
    const incoming = Array.isArray(team) ? team : [];
    const hasIds = incoming.length > 0 && typeof incoming[0] === "string";
    const ids = hasIds ? incoming : incoming.map((u) => u?._id).filter(Boolean);
    setSelectedIds(new Set(ids.map(String)));
  }, [team, open]);

  const selectedUsers = useMemo(() => {
    return filtered.filter((u) => selectedIds.has(String(u._id)));
  }, [filtered, selectedIds]);

  const toggle = (id) => {
    const s = new Set(selectedIds);
    const k = String(id);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    setSelectedIds(s);
    const users = filtered.filter((u) => s.has(String(u._id)));
    setTeam(users.map((u) => u._id));
  };

  const selectAllFiltered = () => {
    const s = new Set(selectedIds);
    const allIds = filtered.map((u) => String(u._id));
    const allSelected = allIds.every((id) => s.has(id));
    if (allSelected) {
      allIds.forEach((id) => s.delete(id));
    } else {
      allIds.forEach((id) => s.add(id));
    }
    setSelectedIds(s);
    const users = filtered.filter((u) => s.has(String(u._id)));
    setTeam(users.map((u) => u._id));
  };

  const labelForButton = selectedUsers.length
    ? selectedUsers.map((u) => u.name).join(", ")
    : "Select team members";

  return (
    <div className=''>
      <p className='text-slate-900 dark:text-gray-500 text-sm'>Assign Task To</p>

      <button
        type='button'
        onClick={() => setOpen(true)}
        className='mt-1 w-full text-left rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50'
      >
        <span className='block truncate'>{labelForButton}</span>
      </button>

      <Transition appear show={open} as={Fragment}>
        <Dialog as='div' className='relative z-50' onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-150'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='fixed inset-0 bg-black/30' />
          </Transition.Child>

          <div className='fixed inset-0 overflow-y-auto'>
            <div className='flex min-h-full items-center justify-center p-4'>
              <Transition.Child
                as={Fragment}
                enter='ease-out duration-200'
                enterFrom='opacity-0 scale-95'
                enterTo='opacity-100 scale-100'
                leave='ease-in duration-150'
                leaveFrom='opacity-100 scale-100'
                leaveTo='opacity-0 scale-95'
              >
                <Dialog.Panel className='w-full max-w-lg rounded-md bg-white shadow-lg border border-gray-200 flex flex-col max-h-[85vh]'>
                  <div className='px-3 py-2 border-b border-gray-100 flex items-center justify-between'>
                    <Dialog.Title className='text-sm font-semibold text-gray-900'>
                      Select members
                    </Dialog.Title>
                    <button
                      type='button'
                      className='text-xs text-gray-500 hover:text-gray-800'
                      onClick={() => setOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className='p-2 space-y-2 border-b border-gray-100'>
                    <input
                      type='search'
                      placeholder='Search name, email, PRN…'
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className='w-full rounded border border-gray-300 px-2 py-1.5 text-sm'
                    />

                    {isPrincipal && (
                      <div className='flex flex-wrap gap-1 items-center'>
                        <span className='text-xs text-gray-500'>Dept</span>
                        <button
                          type='button'
                          onClick={() => setDept("")}
                          className={`text-xs px-2 py-0.5 rounded border ${
                            !dept ? "bg-blue-600 text-white border-blue-600" : "bg-white"
                          }`}
                        >
                          All
                        </button>
                        {DEPARTMENTS.map((d) => (
                          <button
                            key={d}
                            type='button'
                            onClick={() => setDept(d)}
                            className={`text-xs px-2 py-0.5 rounded border ${
                              dept === d ? "bg-blue-600 text-white border-blue-600" : "bg-white"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className='flex flex-wrap gap-2 items-center'>
                      <span className='text-xs text-gray-500'>Year</span>
                      <select
                        className='text-xs border rounded px-2 py-1'
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                      >
                        <option value=''>Any</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      {deptForSection === "COMP" && (
                        <>
                          <span className='text-xs text-gray-500'>Section</span>
                          <input
                            className='text-xs border rounded px-2 py-1 w-20'
                            placeholder='e.g. A'
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                          />
                        </>
                      )}
                    </div>

                    <button
                      type='button'
                      onClick={selectAllFiltered}
                      className='text-xs text-blue-600 hover:underline'
                    >
                      {filtered.length &&
                      filtered.every((u) => selectedIds.has(String(u._id)))
                        ? "Deselect all (filtered)"
                        : "Select all (filtered)"}
                    </button>
                  </div>

                  <div className='overflow-y-auto flex-1 p-1'>
                    {isFetching && (
                      <p className='text-xs text-gray-500 px-2 py-4'>Loading…</p>
                    )}
                    {!isFetching && filtered.length === 0 && (
                      <p className='text-xs text-gray-500 px-2 py-4'>No members match.</p>
                    )}
                    <ul className='divide-y divide-gray-100'>
                      {filtered.map((user) => {
                        const id = String(user._id);
                        const on = selectedIds.has(id);
                        return (
                          <li key={id}>
                            <button
                              type='button'
                              onClick={() => toggle(id)}
                              className='w-full flex items-start gap-2 px-2 py-2 text-left hover:bg-gray-50'
                            >
                              <span className='mt-0.5 text-gray-600'>
                                {on ? (
                                  <MdCheckBox className='w-5 h-5' />
                                ) : (
                                  <MdCheckBoxOutlineBlank className='w-5 h-5' />
                                )}
                              </span>
                              <div className='w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 text-[10px]'>
                                {getInitials(user.name)}
                              </div>
                              <div className='min-w-0 flex-1'>
                                <div className='text-sm font-medium text-gray-900 truncate'>
                                  {user.name}
                                </div>
                                <div className='text-[11px] text-gray-500'>
                                  {user.role || "—"} · {user.department || "—"} · Sec:{" "}
                                  {user.section || "N/A"}
                                  {user.year ? ` · ${user.year}` : ""}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className='p-2 border-t border-gray-100 flex justify-end gap-2'>
                    <button
                      type='button'
                      className='text-xs px-3 py-1.5 rounded border border-gray-200'
                      onClick={() => setOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
