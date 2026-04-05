import {
  NAV,
  type NavGroup,
  type NavItem,
} from './navConfig';

interface StyleguideSidebarProps {
  activeItem: string;
  onSelectPage: (id: string) => void;
}

export function StyleguideSidebar({
  activeItem,
  onSelectPage,
}: StyleguideSidebarProps) {
  return (
    <nav className="sticky top-0 h-screen w-56 shrink-0 overflow-y-auto py-8 pl-6 pr-4 scrollbar-none">
      <a href="#top" className="flex items-center gap-1.5 mb-6">
        <span className="text-[14px] font-semibold text-white tracking-tight">C2 Hub</span>
        <span className="text-[14px] font-normal text-n-8 tracking-tight">docs</span>
      </a>

      {NAV.map((group) => (
        <SidebarGroup
          key={group.label}
          group={group}
          activeItem={activeItem}
          onSelectPage={onSelectPage}
        />
      ))}
    </nav>
  );
}

function SidebarGroup({
  group,
  activeItem,
  onSelectPage,
}: {
  group: NavGroup;
  activeItem: string;
  onSelectPage: (id: string) => void;
}) {
  return (
    <div className="mb-7">
      <span className="block text-[13px] font-semibold text-n-12 mb-3">
        {group.label}
      </span>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            activeItem={activeItem}
            onSelectPage={onSelectPage}
          />
        ))}
      </ul>
    </div>
  );
}

function SidebarItem({
  item,
  activeItem,
  onSelectPage,
}: {
  item: NavItem;
  activeItem: string;
  onSelectPage: (id: string) => void;
}) {
  const isActive = activeItem === item.id;

  return (
    <li>
      <a
        href={`#${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          onSelectPage(item.id);
        }}
        className={`block py-[5px] text-[14px] cursor-pointer transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded-sm ${
          isActive
            ? 'text-white font-medium bg-white/[0.07] px-2 -mx-2 rounded-md'
            : 'text-white/50 font-medium hover:text-n-10'
        }`}
      >
        {item.label}
      </a>
    </li>
  );
}
