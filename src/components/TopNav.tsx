import { useState } from "react";
import {
  Compass,
  PenSquare,
  User,
  History,
  Menu,
  BookOpen,
  Settings,
} from "lucide-react";
import { NavLink } from "./NavLink";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuthStore } from "@/stores/auth.store";
import { useAppI18n } from "@/lib/i18n";

const publicNavItems = [
  { to: "/guide", icon: BookOpen, labelEn: "Guide", labelTh: "คู่มือ" },
  { to: "/explore", icon: Compass, labelEn: "Explore", labelTh: "สำรวจ" },
  { to: "/settings", icon: Settings, labelEn: "Settings", labelTh: "ตั้งค่า" },
];

const authOnlyNavItems = [
  { to: "/history", icon: History, labelEn: "History", labelTh: "ประวัติ" },
  { to: "/create", icon: PenSquare, labelEn: "Create", labelTh: "สร้าง" },
  { to: "/profile", icon: User, labelEn: "Profile", labelTh: "โปรไฟล์" },
];

export function TopNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const token = useAuthStore((s) => s.token);
  const { t } = useAppI18n();
  const showLoginLink = !token && pathname !== "/login";
  const navItems = token
    ? [
        ...publicNavItems.filter((item) => item.to !== "/settings"),
        ...authOnlyNavItems,
        publicNavItems.find((item) => item.to === "/settings")!,
      ]
    : publicNavItems;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-(--app-nav-height) items-center justify-between px-4">
        <Link
          to="/"
          className="font-serif text-lg font-semibold tracking-tight text-foreground"
        >
          Intuita
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, labelEn, labelTh }) => (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="bg-accent text-foreground"
              >
                <Icon className="h-4 w-4" />
                <span>{t(labelEn, labelTh)}</span>
              </NavLink>
            ))}
          </nav>
          {showLoginLink && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">{t("Log in", "เข้าสู่ระบบ")}</Link>
            </Button>
          )}
          <LanguageToggle compact />
          <ThemeToggle compact />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {showLoginLink && (
            <Button variant="outline" size="sm" className="mr-1" asChild>
              <Link to="/login">{t("Log in", "เข้าสู่ระบบ")}</Link>
            </Button>
          )}
          <LanguageToggle compact />
          <ThemeToggle compact />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {navItems.map(({ to, icon: Icon, labelEn, labelTh }) => (
                <DropdownMenuItem
                  key={to}
                  onClick={() => navigate(to)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(labelEn, labelTh)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
