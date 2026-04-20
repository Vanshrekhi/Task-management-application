# Taskify — Project Summary

A full-stack **task management** web application (MERN: MongoDB, Express, React, Node.js) extended for an **academic/college hierarchy**: Principal, HOD, Faculty, and Student roles, with **approval workflows**, **team/task assignment by department**, **real-time chat**, and **email/reminder** infrastructure.

---

## 1. Tech stack

| Layer | Technology |
|--------|------------|
| **Client** | React (Vite), React Router, Redux Toolkit + RTK Query, Tailwind CSS, Headless UI, React Hook Form, Sonner (toasts), Socket.IO client, Firebase (file uploads for task assets) |
| **Server** | Node.js, Express, Mongoose (MongoDB), JWT (cookie-based), Socket.IO, node-cron, BullMQ + ioredis (optional background jobs), Nodemailer (email) |
| **Database** | MongoDB (Atlas `mongodb+srv://` or standard URI) |

---

## 2. Repository layout

- **`/client`** — Single-page React app; Vite dev server (often port 5173) with proxy to API.
- **`/server`** — REST API under `/api`, HTTP + Socket.IO on one process (e.g. port 5000).
- **Environment** — `server/.env` holds `MONGODB_URI`, `JWT_SECRET`, `PORT`, email SMTP, optional `REDIS_URL`, `ADMIN_SECRET_KEY`, optional `MONGODB_URI_ALT`.

---

## 3. Authentication & sessions

- **Login** supports **email or PRN** (identifier) plus **password**, optional **role** and **department** checks to match the stored user.
- **JWT** is issued and stored in an **HTTP-only cookie** (`credentials: "include"` in RTK Query).
- **Protected routes** use middleware that resolves the user from the JWT cookie.
- **Registration** creates users in **`pending`** status (except Principal created with a secret key, who can be **approved** immediately). Only **approved** users can log in.

---

## 4. Roles and hierarchy

| Role | Typical meaning in this app |
|------|-----------------------------|
| **Principal** | Top-level admin (`isAdmin` or role `Principal`); sees HOD approval queue; broad task management. |
| **HOD** | Head of Department; approves **Faculty** and **Student** in **their department only**; sees team lists filtered to that department. |
| **Faculty** | Creates/manages tasks where allowed; **no** student-approval panel in the current flow (students are approved by HOD). |
| **Student** | Task participant; limited management. |
| **Member** | Legacy/default role in schema for older data. |

**Task management permission** (`canManageTasks` on client): Principal, HOD, Faculty — not Students.

---

## 5. Approval workflow (registration)

- **HOD registration** → pending until **Principal** approves.
- **Faculty / Student registration** → pending until **HOD of the same department** approves.
- **Principal** registration uses **`ADMIN_SECRET_KEY`** in the env; valid key → account can be created and approved without going through HOD.

Backend enforces:

- Who can **see** pending requests (`GET /api/user/pending-requests`).
- Who can **approve/reject** (`PUT /api/user/approve/:id`, `PUT /api/user/reject/:id`).

---

## 6. Tasks

- **CRUD** for tasks: title, date, stage (e.g. TODO / IN PROGRESS / COMPLETED), priority, assets (URLs after Firebase upload), **team** (assigned user IDs).
- **Board** and **table** views; trash for soft-deleted tasks where implemented.
- **Role hierarchy** on server (`roleHierarchy.js`): who may assign tasks to whom (e.g. higher rank assigns to lower ranks).
- **Assignment UI**: multi-select of team members; **department filters** for Principal; HOD’s list is scoped by **department** on the API.

---

## 7. Team & users

- **`/team` (Users page)** lists approved team members with **name, title, email, department, role, section** (section shows `N/A` if empty).
- **Department chips** (COMP, IT, ENTC, etc.) filter the list for Principal; **HOD** is restricted to their own department (server-side).
- **Chat** and **team** APIs may use `scope=chat` to return all approved users for chat invites, vs filtered assignable roles for task assignment.

---

## 8. Real-time chat

- **Socket.IO** (`server/index.js`): authenticated via JWT from cookies.
- **Chat rooms** with keys, host, join requests, message history, session end.
- Client **`ChatRoom`** page uses `VITE_SOCKET_URL` or same-origin proxy to reach the API.

---

## 9. Background jobs & reminders

- **BullMQ** queue (`server/queues/reminderQueue.js`) for assignment emails and reminder scans (if **Redis** is reachable).
- If **`REDIS_URL`** is missing or hostname cannot be resolved, the queue **disables** itself to avoid noisy errors in development.
- **node-cron** can enqueue periodic reminder scans when Redis is available.

---

## 10. Email

- SMTP via **Nodemailer** (`emailService.js`): registration / approval notifications when configured (`EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, etc.).

---

## 11. Client app structure (high level)

- **`App.jsx`** — Routes: login, register, dashboards per role, tasks, trash, users, chat, task detail, etc.
- **`redux/`** — `authSlice`, `apiSlice` base URL, RTK Query slices: `authApiSlice`, `taskApiSlice`, `userApiSlice`, `chatApiSlice`.
- **`pages/`** — `AdminDashboard`, `HodDashboard`, `FacultyDashboard`, `StudentDashboard`, `EmployeeDashboard`, `Tasks`, `Users`, `ChatRoom`, `Login`, `Register`, etc.
- **`components/`** — `Sidebar`, `Navbar`, `Table`, `PendingApprovalsPanel`, task dialogs/cards, `UsersSelect` for assignees.

---

## 12. Server structure (high level)

- **`index.js`** — Express app, CORS, MongoDB connect **before** listen, optional BullMQ worker + cron, Socket.IO chat handlers, `httpServer.listen`.
- **`routes/`** — Aggregates `user`, `task`, `chat`, etc.
- **`controllers/`** — `userController`, `taskController`, `chatController`, etc.
- **`models/`** — `userModel`, `taskModel`, `chatRoomModel`, `notis` (notifications).
- **`middleware/`** — `authMiddleware`, `errorMiddleware`.
- **`utils/connectDB.js`** — Mongoose connection with `bufferCommands: false`, retries, optional **`MONGODB_URI_ALT`**, IPv4 preference, troubleshooting hints on DNS/SRV failures.

---

## 13. MongoDB connection errors (`querySrv ECONNREFUSED` / startup crash)

These usually mean **DNS**, **network**, or **Atlas access**, not only app code.

1. **Atlas → Network Access**: allow your current IP.
2. Use a **working** connection string from Atlas (copy from “Connect”).
3. If **`mongodb+srv://`** fails on your PC, try the **standard (non-SRV)** connection string from Atlas and set it as **`MONGODB_URI`**, or set **`MONGODB_URI_ALT`** as a second URI the app will try.
4. Check **VPN / firewall / DNS**; try another network.

---

## 14. How to run (typical)

1. **MongoDB** URI in `server/.env`.
2. `cd server && npm install && npm run dev`
3. `cd client && npm install && npm run dev`
4. Open the Vite URL; ensure client `proxy` / API base URL points to the API.

---

## 15. Summary in one sentence

**Taskify** is a MERN task manager with **role-based dashboards**, **department-scoped approval and team listing**, **task assignment with role rules**, **optional Redis-backed reminders**, **Socket.IO chat**, and **JWT cookie authentication**.
