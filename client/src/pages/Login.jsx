import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Textbox } from "../components";
import { useLoginMutation } from "../redux/slices/api/authApiSlice";
import { setCredentials } from "../redux/slices/authSlice";

const ROLES = ["Principal", "HOD", "Faculty", "Student"];
const DEPARTMENTS = ["COMP", "IT", "ENTC", "MECH", "CIVIL", "OTHER"];

const Login = () => {
  const { user } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (data) => {
    try {
      const payload = {
        identifier: data.identifier?.trim(),
        password: data.password,
        role: data.role,
        department: data.department,
      };

      const res = await login(payload).unwrap();

      const userData = res.user || res;
      dispatch(setCredentials(userData));

      const role = userData?.role;
      const isAdmin = userData?.isAdmin || role === "Principal";

      if (isAdmin) {
        navigate("/admin-dashboard");
      } else if (role === "HOD") {
        navigate("/hod-dashboard");
      } else if (role === "Faculty") {
        navigate("/faculty-dashboard");
      } else if (role === "Student") {
        navigate("/student-dashboard");
      } else {
        navigate("/employee-dashboard");
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  useEffect(() => {
    if (user) {
      const role = user?.role;
      const isAdmin = user?.isAdmin || role === "Principal";

      if (isAdmin) {
        navigate("/admin-dashboard");
      } else if (role === "HOD") {
        navigate("/hod-dashboard");
      } else if (role === "Faculty") {
        navigate("/faculty-dashboard");
      } else if (role === "Student") {
        navigate("/student-dashboard");
      } else {
        navigate("/employee-dashboard");
      }
    }
  }, [user]);

  return (
    <div className='w-full min-h-screen flex items-center justify-center bg-[#f3f4f6]'>
      <form
        onSubmit={handleSubmit(handleLogin)}
        className='w-full max-w-sm bg-white border border-gray-200 rounded-md shadow-sm px-4 py-3 flex flex-col gap-2'
      >
        <div className='mb-1'>
          <p className='text-lg font-semibold text-gray-900'>Login</p>
          <p className='text-xs text-gray-500'>
            Only approved accounts can login.
          </p>
        </div>

        <Textbox
          placeholder='Email or PRN'
          type='text'
          name='identifier'
          label='Email / PRN'
          labelClass='text-xs'
          className='w-full rounded px-2 py-1.5 text-sm'
          register={register("identifier", {
            required: "Email or PRN is required!",
          })}
          error={errors.identifier ? errors.identifier.message : ""}
        />

        <Textbox
          placeholder='Password'
          type='password'
          name='password'
          label='Password'
          labelClass='text-xs'
          className='w-full rounded px-2 py-1.5 text-sm'
          register={register("password", {
            required: "Password is required!",
          })}
          error={errors.password ? errors.password?.message : ""}
        />

        <div className='grid grid-cols-2 gap-2'>
          <div className='w-full flex flex-col gap-1'>
            <span className='text-xs text-slate-900'>Role</span>
            <select
              className='border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 ring-blue-300'
              {...register("role", { required: "Role is required!" })}
            >
              <option value=''>Select</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.role && (
              <span className='text-xs text-[#f64949fe]'>{errors.role.message}</span>
            )}
          </div>

          <div className='w-full flex flex-col gap-1'>
            <span className='text-xs text-slate-900'>Department</span>
            <select
              className='border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 ring-blue-300'
              {...register("department")}
            >
              <option value=''>Any</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <Button
            type='submit'
            label='Log in'
            className='w-full h-9 bg-blue-700 text-white rounded'
          />
        )}

        <p className='text-center text-xs text-gray-600'>
          Don't have an account?{" "}
          <Link to='/register' className='text-blue-600 hover:underline font-medium'>
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;