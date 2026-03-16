"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  ChevronUp,
  User,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface SidebarProps {
  brandName?: string;
  navigation?: NavSection[];
  user?: UserProfile;
  onLogout?: () => void;
  className?: string;
}

const defaultNavigation: NavSection[] = [
  {
    title: "Menu",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Users", href: "/dashboard/users", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: User },
    ],
  },
];

const defaultUser: UserProfile = {
  name: "Isabella Swan",
  email: "admin@aether.com",
  role: "Admin",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
};

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm transition-all group",
        isActive
          ? "bg-primary text-primary-foreground font-medium shadow-[0_0_15px_rgba(220,218,203,0.1)]"
          : "text-muted-foreground hover:text-foreground hover:bg-card font-light"
      )}
    >
      <item.icon
        className={cn(
          "h-[18px] w-[18px] transition-colors",
          isActive ? "" : "group-hover:text-foreground"
        )}
        strokeWidth={1.5}
      />
      <span className="flex-1">{item.title}</span>
      {item.badge && (
        <span className="bg-secondary text-foreground text-xs py-0.5 px-2 font-light">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  brandName = "A E T H E R",
  navigation = defaultNavigation,
  user = defaultUser,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
        <Link
          href="/"
          className="text-lg tracking-[0.15em] font-medium uppercase"
        >
          {brandName}
        </Link>
      </div>

      {/* Nav Links */}
      <ScrollArea className="flex-1 py-6 px-3">
        <nav className="flex flex-col gap-1">
          {navigation.map((section, idx) => (
            <React.Fragment key={section.title}>
              {idx > 0 && <div className="mt-5" />}
              <span className="text-xs uppercase tracking-widest font-light text-muted-foreground px-3 mb-2 mt-2">
                {section.title}
              </span>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                />
              ))}
            </React.Fragment>
          ))}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2 py-2 hover:bg-card transition-colors text-left">
              <Avatar className="h-8 w-8 border border-accent shrink-0">
                <AvatarImage
                  src={user.avatar}
                  alt={user.name}
                  className="grayscale opacity-80"
                />
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-normal truncate">{user.name}</span>
                <span className="text-xs text-muted-foreground font-light truncate">
                  {user.role}
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56 mb-2"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-normal">{user.name}</p>
                <p className="text-xs text-muted-foreground font-light">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="flex items-center gap-3 cursor-pointer">
                <User className="h-4 w-4" strokeWidth={1.5} />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-3" strokeWidth={1.5} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 border-r border-border flex-col h-full bg-background shrink-0">
      <SidebarContent {...props} />
    </aside>
  );
}

export function MobileSidebar(props: SidebarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-background border-r border-border">
        <div className="flex flex-col h-full">
          <SidebarContent {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardSidebar(props: SidebarProps) {
  return (
    <>
      <Sidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
}
