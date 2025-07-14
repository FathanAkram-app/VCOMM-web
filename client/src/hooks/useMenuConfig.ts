import { useQuery } from "@tanstack/react-query";

export interface MenuConfig {
  menu_chat_enabled: boolean;
  menu_calls_enabled: boolean;
  menu_personnel_enabled: boolean;
  menu_settings_enabled: boolean;
  menu_lapsit_enabled: boolean;
}

export function useMenuConfig() {
  const { data: menuConfig, isLoading } = useQuery<MenuConfig>({
    queryKey: ['/api/config/menu'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    menuConfig: menuConfig || {
      menu_chat_enabled: true,
      menu_calls_enabled: true,
      menu_personnel_enabled: true,
      menu_settings_enabled: true,
      menu_lapsit_enabled: false,
    },
    isLoading,
  };
}