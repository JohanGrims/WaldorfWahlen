import React from "react";


/*
    * CheckItem component
    * @param {string} label - The label of the checkbox
    * @param {boolean} checked - The state of the checkbox
*/
export default function CheckItem({
  label,
  checked,
  checkedIcon = "done",
  uncheckedIcon = "close",
}: {
  label: string;
  checked: boolean;
  checkedIcon?: string;
  uncheckedIcon?: string;
}) {
  if (checked) {
    return (
      <mdui-checkbox disabled checked checked-icon={checkedIcon}>
        {label}
      </mdui-checkbox>
    );
  }
  return (
    <mdui-checkbox disabled unchecked-icon={uncheckedIcon}>
      {label}
    </mdui-checkbox>
  );
}
