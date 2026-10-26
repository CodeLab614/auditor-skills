import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TextFieldProps = {
  id: string;
  label: string;
  help?: string;
  className?: string;
} & (
  | ({ as?: "input" } & ComponentProps<typeof Input>)
  | ({ as: "textarea" } & ComponentProps<typeof Textarea>)
);

export function TextField(props: TextFieldProps) {
  if ("as" in props && props.as === "textarea") {
    const { id, label, help, className, as, ...attributes } = props;
    return (
      <div className="auditor-text-field" data-field-as={as}>
        <Label className="auditor-text-field__label" htmlFor={id}>{label}</Label>
        <Textarea {...attributes} id={id}
          className={cn("auditor-text-field__control", className)} />
        {help && <span className="auditor-text-field__help">{help}</span>}
      </div>
    );
  }
  const { id, label, help, className, ...attributes } = props;
  return (
    <div className="auditor-text-field">
      <Label className="auditor-text-field__label" htmlFor={id}>{label}</Label>
      <Input {...attributes} id={id}
        className={cn("auditor-text-field__control", className)} />
      {help && <span className="auditor-text-field__help">{help}</span>}
    </div>
  );
}
