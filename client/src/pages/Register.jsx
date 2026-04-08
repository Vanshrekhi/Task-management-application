import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Textbox } from "../components";
import { useRegisterMutation } from "../redux/slices/api/authApiSlice";
import { setCredentials } from "../redux/slices/authSlice";

const Register = () => {
  const { user } = useSelector((state) => state.auth);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [registerUser, { isLoading }] = useRegisterMutation();

  const handleRegister = async (data) => {
    const { confirmPassword, isAdmin, ...registerData } = data;
    try {
      const res = await registerUser({
        ...registerData,
        isAdmin: isAdmin || false,
        title: registerData.title || "Team Member",
        role: registerData.role || "Member",
      }).unwrap();
      const userData = res.user || res;
      dispatch(setCredentials(userData));
      toast.success("Account created successfully!");
      if (userData.isAdmin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/employee-dashboard");
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/employee-dashboard");
      }
    }
  }, [user]);

  return (
    <div className='w-full min-h-screen flex items-center justify-center bg-[#f3f4f6]'>
      <div className='w-full md:w-auto flex flex-col md:flex-row items-center justify-center gap-10 p-4'>
        <div className='flex flex-col items-center gap-4'>
          <span className='py-1 px-3 border rounded-full text-sm border-gray-300 text-gray-600'>
            Manage all your task in one place!
          </span>
          <p className='flex flex-col text-4xl md:text-6xl font-black text-center text-blue-700'>
            <span>Cloud-based</span>
            <span>Task Manager</span>
          </p>
        </div>

        <div className='form-container w-full md:w-[420px] bg-white px-10 py-8 shadow-lg rounded-lg'>
          <p className='text-blue-600 text-3xl font-bold text-center mb-1'>Create Account</p>
          <p className='text-center text-sm text-gray-500 mb-5'>Join your team on Taskify!</p>

          <div className='flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-300 mb-5'>
            <input
              type='checkbox'
              id='isAdmin'
              {...register("isAdmin")}
              className='w-5 h-5 cursor-pointer accent-blue-600'
            />
            <label htmlFor='isAdmin' className='text-sm font-bold text-blue-700 cursor-pointer'>
              👑 Register as Admin
            </label>
          </div>

          <form onSubmit={handleSubmit(handleRegister)} className='flex flex-col gap-y-4'>
            <Textbox placeholder='Full Name' type='text' name='name' label='Full Name'
              className='w-full rounded-full'
              register={register("name", { required: "Full name is required!" })}
              error={errors.name?.message || ""} />

            <Textbox placeholder='you@example.com' type='email' name='email' label='Email Address'
              className='w-full rounded-full'
              register={register("email", { required: "Email is required!" })}
              error={errors.email?.message || ""} />

            <Textbox placeholder='e.g. Frontend Developer' type='text' name='title' label='Job Title'
              className='w-full rounded-full'
              register={register("title", { required: "Job title is required!" })}
              error={errors.title?.message || ""} />

            <Textbox placeholder='e.g. Developer, Designer' type='text' name='role' label='Role'
              className='w-full rounded-full'
              register={register("role", { required: "Role is required!" })}
              error={errors.role?.message || ""} />

            <Textbox placeholder='Create a password' type='password' name='password' label='Password'
              className='w-full rounded-full'
              register={register("password", { required: "Password is required!", minLength: { value: 6, message: "Min 6 characters" } })}
              error={errors.password?.message || ""} />

            <Textbox placeholder='Confirm your password' type='password' name='confirmPassword' label='Confirm Password'
              className='w-full rounded-full'
              register={register("confirmPassword", { required: "Please confirm!", validate: (val) => val === watch("password") || "Passwords do not match!" })}
              error={errors.confirmPassword?.message || ""} />

            {isLoading ? <Loading /> : (
              <Button type='submit' label='Create Account'
                className='w-full h-10 bg-blue-700 text-white rounded-full mt-2' />
            )}

            <p className='text-center text-sm text-gray-600'>
              Already have an account?{" "}
              <Link to='/log-in' className='text-blue-600 hover:underline font-medium'>Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;