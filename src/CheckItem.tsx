import React from "react";

export default function CheckItem({ label, checked }) {
  if (checked) {
    return (
      <mdui-checkbox disabled checked checked-icon="done">
        {label}
      </mdui-checkbox>
    );
  }
  return (
    <mdui-checkbox disabled unchecked-icon="close">
      {label}
    </mdui-checkbox>
  );
}
