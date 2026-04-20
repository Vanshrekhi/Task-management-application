import Dashboard from "./Dashboard";
import PendingApprovalsPanel from "../components/PendingApprovalsPanel";

const HodDashboard = () => {
  return (
    <div className='flex flex-col gap-3'>
      <PendingApprovalsPanel title='Faculty & Student approval requests' />
      <Dashboard />
    </div>
  );
};

export default HodDashboard;

