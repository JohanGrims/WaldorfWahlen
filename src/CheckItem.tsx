import React from "react";


/*
    * CheckItem component
    * @param {string} label - The label of the checkbox
    * @param {boolean} checked - The state of the checkbox
    */
*/
export default function CheckItem({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
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
