import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Bell, 
  Settings, 
  Check, 
  ChevronDown, 
  MessageSquare, 
  ShieldAlert, 
  Radio, 
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type NotificationType = "alert" | "info" | "message" | "system";
type Priority = "critical" | "high" | "medium" | "low";

interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: Priority;
  title: string;
  description: string;
  time: string; // e.g., "10:42 AM" or "Feb 10"
  dateCategory: "Today" | "Yesterday" | "Last 7 Days" | "Older";
  read: boolean;
  sender?: string; // "System", "Commander", etc.
  icon?: React.ReactNode;
}

// --- Mock Data ---
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

// --- Icons Helper ---
const getIcon = (type: NotificationType, priority: Priority) => {
  const size = 18;
  if (type === "alert" || priority === "critical") return <ShieldAlert size={size} />;
  if (priority === "high") return <AlertTriangle size={size} />;
  if (type === "message") return <MessageSquare size={size} />;
  if (type === "system") return <Radio size={size} />;
  return <Info size={size} />;
};

const getPriorityColor = (priority: Priority) => {
  // Kept for reference or other uses, though Row handles its own colors now
  switch (priority) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    default: return "bg-blue-500";
  }
};

// --- Components ---

const NotificationRow = ({ item }: { item: NotificationItem }) => {
  return (
    <div className={`
      group relative flex gap-4 p-4 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-[#333]/30 last:border-0
      ${!item.read ? 'bg-blue-500/[0.04]' : ''}
    `}>
      {/* Unread Indicator - Left Accent Bar */}
      {!item.read && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 shadow-[2px_0_8px_rgba(59,130,246,0.2)]" />
      )}

      {/* Icon Section */}
      <div className="relative shrink-0 pt-0.5">
        <div className={`
          w-9 h-9 rounded-lg flex items-center justify-center border border-white/5 shadow-sm
          ${item.priority === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
            item.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
            item.type === 'message' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            item.type === 'system' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
            'bg-[#25262b] text-gray-400 border-white/10'}
        `}>
          {getIcon(item.type, item.priority)}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        
        {/* Header Line: Sender & Time */}
        <div className="flex justify-between items-center h-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#666] group-hover:text-[#888] transition-colors">
            {item.sender}
          </span>
          <span className="text-[10px] text-[#555] font-medium font-mono tabular-nums">
            {item.time}
          </span>
        </div>

        {/* Title */}
        <h4 className={`text-[13px] leading-5 font-medium ${!item.read ? 'text-gray-100' : 'text-gray-400'}`}>
          {item.title}
        </h4>

        {/* Description */}
        <p className="text-[12px] leading-5 text-[#888] line-clamp-2 pr-1 font-light">
          {item.description}
        </p>
      </div>
    </div>
  );
};

type NotificationCenterProps = {
  /** Optional custom trigger (e.g. sidebar icon). Receives open state and must call open/close. */
  trigger?: React.ReactElement;
};

const PANEL_PADDING = 12;
const PANEL_GAP = 8;

export const NotificationCenter = ({ trigger: customTrigger }: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "alerts" | "unread">("all");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS_HISTORY);
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // Position panel fixed and clamp to viewport when open (layout effect to avoid flash)
  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const maxH = viewportH - PANEL_PADDING * 2;
    const panelW = 380;
    const minPanelHeight = 200;
    let left: number;
    if (customTrigger) {
      left = rect.left - panelW - PANEL_GAP;
    } else {
      left = rect.left;
    }
    const clampedLeft = Math.max(PANEL_PADDING, Math.min(left, viewportW - panelW - PANEL_PADDING));

    const spaceBelow = viewportH - rect.bottom - PANEL_GAP - PANEL_PADDING;
    const spaceAbove = rect.top - PANEL_GAP - PANEL_PADDING;
    const openAbove = spaceBelow < minPanelHeight && spaceAbove >= spaceBelow;

    let top: number;
    let height: number;
    if (openAbove) {
      height = Math.max(minPanelHeight, Math.min(maxH, spaceAbove));
      top = rect.top - height - PANEL_GAP;
    } else {
      top = rect.bottom + PANEL_GAP;
      height = Math.max(minPanelHeight, Math.min(maxH, spaceBelow > 0 ? spaceBelow : maxH));
    }

    const style = {
      position: 'fixed' as const,
      left: clampedLeft,
      top: Math.max(PANEL_PADDING, top),
      width: panelW,
      maxWidth: `calc(100vw - ${PANEL_PADDING * 2}px)` as const,
      height,
      maxHeight: height,
    };
    setPanelStyle(style);
  }, [isOpen, customTrigger]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter Logic
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "alerts") return n.type === "alert";
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Grouping Logic
  const grouped = {
    "Today": filteredNotifications.filter(n => n.dateCategory === "Today"),
    "Yesterday": filteredNotifications.filter(n => n.dateCategory === "Yesterday"),
    "Last 7 Days": filteredNotifications.filter(n => n.dateCategory === "Last 7 Days"),
    "Older": filteredNotifications.filter(n => n.dateCategory === "Older"),
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleOpen = () => setIsOpen((o) => !o);
  const badge = unreadCount > 0 ? (
    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-[#141414] flex items-center justify-center text-[8px] font-bold text-white shadow-sm pointer-events-none">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  ) : null;

  return (
    <div className="relative font-sans" dir="rtl" ref={containerRef}>
      {customTrigger ? (
        <div className="relative inline-flex">
          {React.cloneElement(customTrigger, {
            onClick: (e: React.MouseEvent) => {
              (customTrigger.props as { onClick?: (e: React.MouseEvent) => void })?.onClick?.(e);
              toggleOpen();
            },
          })}
          {badge}
        </div>
      ) : (
        <button
          onClick={toggleOpen}
          className={`
            relative w-10 h-10 rounded-full flex items-center justify-center 
            transition-all duration-200 border
            ${isOpen 
              ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' 
              : 'bg-[#141414] border-[#333] text-[#a5a5a5] hover:text-white hover:border-[#555]'
            }
          `}
        >
          <Bell size={18} />
          {badge}
        </button>
      )}

      {/* Dropdown Panel - portaled to document.body so position:fixed is viewport-relative (nav has backdrop-blur which creates a containing block) */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col bg-[#141414] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-[9999] ring-1 ring-white/5 origin-top-left"
              style={{
                position: 'fixed',
                width: 380,
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 24px)',
                ...panelStyle,
                boxShadow: "0 40px 60px -15px rgba(0, 0, 0, 0.7), 0 20px 30px -10px rgba(0, 0, 0, 0.6)",
              }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#333] flex justify-between items-center bg-[#141414]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-200 tracking-wide">מרכז התראות</h3>
                  <span className="text-[10px] bg-[#222] text-[#888] px-1.5 py-0.5 rounded border border-[#333]">beta</span>
                </div>
                <div className="flex gap-1">
                  <button 
                     onClick={markAllAsRead}
                     className="text-[10px] text-[#666] hover:text-blue-400 font-medium transition-colors px-2 py-1 rounded hover:bg-white/5"
                   >
                     סמן הכל כנקרא
                   </button>
                  <button className="text-[#555] hover:text-white transition-colors p-1.5 rounded hover:bg-white/5">
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center px-4 pt-2 border-b border-[#333] bg-[#141414]">
                 <div className="flex gap-6">
                    {(["all", "alerts", "unread"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                          text-[12px] font-medium pb-2 border-b-[2px] transition-all relative
                          ${activeTab === tab 
                            ? 'text-white border-blue-500' 
                            : 'text-[#666] border-transparent hover:text-[#999]'
                          }
                        `}
                      >
                        {tab === "all" ? "הכל" : tab === "alerts" ? "דחוף" : "לא נקראו"}
                        {tab === "unread" && unreadCount > 0 && (
                          <span className="mr-1.5 text-[10px] bg-[#333] text-[#aaa] px-1 rounded-full">{unreadCount}</span>
                        )}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Scrollable List - flex-1 min-h-0 so panel height is bounded and only list scrolls */}
              <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                 {Object.entries(grouped).map(([category, items]) => {
                   if (items.length === 0) return null;
                   return (
                     <div key={category} className="flex flex-col">
                        <div className="sticky top-0 z-10 bg-[#141414]/95 backdrop-blur-sm px-4 py-2 border-b border-[#333]/30 flex items-center">
                           <span className="text-[10px] font-bold text-[#444] uppercase tracking-wider">
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
                   <div className="flex flex-col items-center justify-center py-20 text-[#444] gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-[#222]">
                          <CheckCircle2 size={20} />
                      </div>
                      <span className="text-xs font-medium">הכל נקי, אין התראות</span>
                   </div>
                 )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-[#333] bg-[#141414] flex justify-center">
                 <button className="flex items-center gap-1.5 text-[11px] text-[#666] hover:text-white transition-colors py-1 px-3 rounded hover:bg-white/5">
                    <span>כל ההיסטוריה</span>
                    <ChevronDown size={12} className="rotate-[90deg]" />
                 </button>
              </div>

            </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
