"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarRange,
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { can, type Action } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";
import type { SessionUser } from "@/lib/dal";
import type { Role } from "@/lib/generated/prisma/enums";

type NavItem = { title: string; href: string; icon: LucideIcon; action?: Action; roles?: Role[] };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "General",
    items: [
      { title: "Inicio", href: "/", icon: Home },
      { title: "Tablero", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "COORDINADOR", "VISOR"] },
      { title: "Mis unidades", href: "/campo", icon: ClipboardList, roles: ["ADMIN", "ENCUESTADOR"] },
      { title: "Unidades", href: "/units", icon: Building2, action: "unit:assign" },
      { title: "Revisión", href: "/review", icon: ClipboardCheck, action: "submission:review" },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Usuarios", href: "/admin/users", icon: Users, action: "admin:manage" },
      { title: "Campaña", href: "/admin/campaign", icon: CalendarRange, action: "admin:manage" },
    ],
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (!item.action || can(user, item.action)) && (!item.roles || item.roles.includes(user.role)),
    ),
  })).filter((group) => group.items.length > 0);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Padrón Puebla</span>
                  <span className="truncate text-xs text-muted-foreground">Censo de unidades</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                align="end"
                className="min-w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
