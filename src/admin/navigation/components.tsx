import React from "react";

interface DrawerItemProps {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  [key: string]: any;
}

/**
 * DrawerItem component.
 *
 * @param {DrawerItemProps} props - The properties object.
 * @returns {JSX.Element} The DrawerItem component.
 */
export function DrawerItem({
  active,
  icon,
  title,
  onClick,
  ...props
}: DrawerItemProps): JSX.Element {
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
