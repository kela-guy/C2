import React, { useState } from "react";
import {
  Bell,
  Settings,
  ChevronDown,
  MessageSquare,
  ShieldAlert,
  Radio,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

type NotificationType = "alert" | "info" | "message" | "system";
type Priority = "critical" | "high" | "medium" | "low";

interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: Priority;
  title: string;
  description: string;
  time: string;
  dateCategory: "Today" | "Yesterday" | "Last 7 Days" | "Older";
  read: boolean;
  sender?: string;
  icon?: React.ReactNode;
}

const MOCK_NOTIFICATIONS_HISTORY: NotificationItem[] = [
  {
    id: "1",
    type: "alert",
    priority: "critical",
    title: "זיהוי שיגור טילים",
    description: "זוהה שיגור רב-קני מכיוון גזרה צפונית. הופעלו מערכות יירוט אוטומטיות.",
    time: "10:42",
    dateCategory: "Today",
    read: false,
    sender: "מכ״ם גזרתי"
  },
  {
    id: "2",
    type: "message",
    priority: "high",
    title: "עדכון פקודה מבצעית",
    description: "התקבל עדכון לפקודת 'אש חיה'. נא לאשר קבלה ולקרוא את הנספחים המצורפים.",
    time: "09:15",
    dateCategory: "Today",
    read: false,
    sender: "חמ״ל ראשי"
  },
  {
    id: "3",
    type: "system",
    priority: "medium",
    title: "תחזוקת שרתים",
    description: "השרת יעבור לאתחול יזום בשעה 02:00. ייתכנו שיבושים קלים בזרימת המידע.",
    time: "14:30",
    dateCategory: "Yesterday",
    read: true,
    sender: "IT System"
  },
  {
    id: "4",
    type: "info",
    priority: "low",
    title: "דוח סיור יומי",
    description: "דוח סיור שגרתי מגזרת החוף זמין לצפייה.",
    time: "Feb 9",
    dateCategory: "Last 7 Days",
    read: true,
    sender: "צוות סיור 4"
  },
  {
    id: "5",
    type: "alert",
    priority: "medium",
    title: "אובדן אות GPS",
    description: "שיבושי קליטה זמניים נרשמו באזור הפעולה המשני.",
    time: "Feb 8",
    dateCategory: "Last 7 Days",
    read: true,
    sender: "מערכת ניווט"
  },
  {
    id: "6",
    type: "system",
    priority: "low",
    title: "עדכון תוכנה 2.4.1",
    description: "הותקן בהצלחה. שיפורים ביציבות מערכת התצפית.",
    time: "Feb 5",
    dateCategory: "Older",
    read: true,
    sender: "System Update"
  },
  {
    id: "7",
    type: "message",
    priority: "medium",
    title: "בקשת אישור טיסה",
    description: "רחפן 'עין הנץ' ממתין לאישור המראה.",
    time: "Feb 3",
    dateCategory: "Older",
    read: true,
    sender: "בקר אווירי"
  }
];

const getIcon = (type: NotificationType, priority: Priority) => {
  const size = 18;
  if (type === "alert" || priority === "critical") return <ShieldAlert size={size} />;
  if (priority === "high") return <AlertTriangle size={size} />;
  if (type === "message") return <MessageSquare size={size} />;
  if (type === "system") return <Radio size={size} />;
  return <Info size={size} />;
};

const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    default: return "bg-blue-500";
  }
};

const NotificationRow = ({ item }: { item: NotificationItem }) => {
  return (
    <div className={`
      group relative flex gap-4 p-4 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-border/30 last:border-0
      ${!item.read ? 'bg-blue-500/[0.04]' : ''}
    `}>
      {!item.read && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 shadow-[2px_0_8px_rgba(59,130,246,0.2)]" />
      )}

      <div className="relative shrink-0 pt-0.5">
        <div className={`
          w-9 h-9 rounded-lg flex items-center justify-center shadow-sm
          ${item.priority === 'critical' ? 'bg-red-500/10 text-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' :
            item.priority === 'high' ? 'bg-orange-500/10 text-orange-500 shadow-[0_0_0_1px_rgba(249,115,22,0.2)]' :
            item.type === 'message' ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]' :
            item.type === 'system' ? 'bg-purple-500/10 text-purple-400 shadow-[0_0_0_1px_rgba(168,85,247,0.2)]' :
            'bg-zinc-900 text-gray-400 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'}
        `}>
          {getIcon(item.type, item.priority)}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex justify-between items-center h-5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/70 group-hover:text-white/90 transition-colors">
            {item.sender}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium font-mono tabular-nums">
            {item.time}
          </span>
        </div>

        <h4 className={`text-[13px] leading-5 font-medium ${!item.read ? 'text-gray-100' : 'text-gray-400'}`}>
          {item.title}
        </h4>

        <p className="text-[12px] leading-5 text-zinc-400 line-clamp-2 pr-1 font-light">
          {item.description}
        </p>
      </div>
    </div>
  );
};

type NotificationCenterProps = {
  trigger?: React.ReactElement;
};

export const NotificationCenter = ({ trigger: customTrigger }: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "alerts" | "unread">("all");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS_HISTORY);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "alerts") return n.type === "alert";
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const grouped = {
    "Today": filteredNotifications.filter(n => n.dateCategory === "Today"),
    "Yesterday": filteredNotifications.filter(n => n.dateCategory === "Yesterday"),
    "Last 7 Days": filteredNotifications.filter(n => n.dateCategory === "Last 7 Days"),
    "Older": filteredNotifications.filter(n => n.dateCategory === "Older"),
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const badge = unreadCount > 0 ? (
    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-white tabular-nums shadow-sm pointer-events-none">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  ) : null;

  return (
    <div className="relative font-sans">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {customTrigger ? (
            <div className="relative inline-flex">
              {customTrigger}
              {badge}
            </div>
          ) : (
            <button
              aria-label="מרכז התראות"
              className={`
                relative w-10 h-10 rounded-full flex items-center justify-center
                transition-colors duration-200 border
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25
                ${isOpen
                  ? 'bg-blue-900/30 border-blue-500/50 text-blue-400'
                  : 'bg-zinc-950 border-border text-zinc-300 hover:text-white hover:border-zinc-500'
                }
              `}
            >
              <Bell size={18} />
              {badge}
            </button>
          )}
        </SheetTrigger>

        <SheetContent
          side="right"
          dir="rtl"
          className="w-[380px] sm:max-w-[380px] p-0 gap-0 bg-zinc-950 border-border font-sans"
        >
          <SheetHeader className="px-4 py-3 pr-10 border-b border-border flex-row justify-between items-center space-y-0">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-sm font-bold text-gray-200 tracking-wide">
                מרכז התראות
              </SheetTitle>
              <span className="text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded ring-1 ring-white/10">
                beta
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={markAllAsRead}
                className="text-[10px] text-zinc-500 hover:text-blue-400 font-medium transition-colors px-2 py-1 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              >
                סמן הכל כנקרא
              </button>
              <button
                aria-label="הגדרות התראות"
                className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              >
                <Settings size={14} />
              </button>
            </div>
          </SheetHeader>

          <div className="flex items-center px-4 pt-2 border-b border-border bg-zinc-950">
            <div className="flex gap-6">
              {(["all", "alerts", "unread"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    text-[12px] font-medium pb-2 border-b-[2px] transition-colors relative
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25
                    ${activeTab === tab
                      ? 'text-white border-blue-500'
                      : 'text-zinc-500 border-transparent hover:text-zinc-400'
                    }
                  `}
                >
                  {tab === "all" ? "הכל" : tab === "alerts" ? "דחוף" : "לא נקראו"}
                  {tab === "unread" && unreadCount > 0 && (
                    <span className="mr-1.5 text-[10px] bg-white/10 text-zinc-400 px-1 rounded-full tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {Object.entries(grouped).map(([category, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={category} className="flex flex-col">
                  <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm px-4 py-2 border-b border-border/30 flex items-center">
                    <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
                      {category === "Today" ? "היום" :
                       category === "Yesterday" ? "אתמול" :
                       category === "Last 7 Days" ? "השבוע" : "היסטוריה"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {items.map(item => (
                      <NotificationRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center ring-1 ring-zinc-900">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-xs font-medium">הכל נקי, אין התראות</span>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border bg-zinc-950 flex justify-center">
            <button className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors py-1 px-3 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
              <span>כל ההיסטוריה</span>
              <ChevronDown size={12} className="rotate-[90deg]" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
