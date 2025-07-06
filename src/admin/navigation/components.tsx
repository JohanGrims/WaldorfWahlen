import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "mdui-list-item-content": any;
    }
  }
}

interface DrawerItemProps {
  active?: boolean;
  icon?: string;
  title: string;
  onClick: (event: React.MouseEvent) => void;
  [key: string]: any; // For ...props
}

export function DrawerItem({
  active,
  icon,
  title,
  onClick,
  ...props
}: DrawerItemProps) {
  if (active) {
    return (
      <mdui-list-item active {...props} rounded onClick={onClick} icon={icon}>
        <mdui-list-item-content>{title}</mdui-list-item-content>
      </mdui-list-item>
    );
  }
  return (
    <mdui-list-item {...props} rounded onClick={onClick} icon={icon}>
      <mdui-icon slot="icon">{icon}</mdui-icon>
      <mdui-list-item-content>{title}</mdui-list-item-content>
    </mdui-list-item>
  );
}
