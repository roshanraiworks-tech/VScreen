import {
  LayoutGrid,
  MessageCircle,
  Upload,
  ShieldCheck,
  MonitorPlay,
  LogOut,
} from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`vs-sidebar-link w-full text-left ${
        active ? "vs-sidebar-link-active" : ""
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function AppShell({
  userEmail,
  socketStatus,
  roomId,
  activeTab,
  setActiveTab,
  onSignOut,
  children,
}) {
  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-400 gap-6 p-4 lg:grid-cols-[280px_1fr] lg:p-6">
        <aside className="vs-card flex flex-col p-5">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-black text-white shadow-lg">
                VS
              </div>
              <div>
                <h1 className="text-xl font-semibold">Virtual Screen</h1>
                <p className="text-sm text-slate-400">Watch, chat, sync, call</p>
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <Badge tone={socketStatus === "Connected" ? "success" : "danger"}>
              {socketStatus}
            </Badge>
            <div className="text-sm text-slate-400">
              {userEmail ? userEmail : "Not signed in"}
            </div>
            {roomId && <Badge tone="primary">Room: {roomId}</Badge>}
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            <NavItem
              icon={<LayoutGrid size={18} />}
              label="Dashboard"
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
            />
            <NavItem
              icon={<MonitorPlay size={18} />}
              label="Watch Room"
              active={activeTab === "watch"}
              onClick={() => setActiveTab("watch")}
            />
            <NavItem
              icon={<MessageCircle size={18} />}
              label="Chat"
              active={activeTab === "chat"}
              onClick={() => setActiveTab("chat")}
            />
            <NavItem
              icon={<Upload size={18} />}
              label="Uploads"
              active={activeTab === "uploads"}
              onClick={() => setActiveTab("uploads")}
            />
      
            <NavItem
              icon={<ShieldCheck size={18} />}
              label="Security"
              active={activeTab === "security"}
              onClick={() => setActiveTab("security")}
            />
          </nav>

          <div className="mt-6">
            <Button variant="ghost" className="w-full" onClick={onSignOut}>
              <LogOut size={16} /> Sign Out
            </Button>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}