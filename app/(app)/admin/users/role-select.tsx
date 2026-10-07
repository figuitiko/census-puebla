"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Role } from "@/lib/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/roles";

type Props = {
  value?: Role;
  defaultValue?: Role;
  name?: string;
  disabled?: boolean;
  onValueChange?: (role: Role) => void;
};

export function RoleSelect({ value, defaultValue, name, disabled, onValueChange }: Props) {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      name={name}
      disabled={disabled}
      onValueChange={(next) => onValueChange?.(next as Role)}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(Role).map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
