export function DrawerItem({ active, icon, title, onClick, ...props }) {
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
