import {
  forwardRef,
  type AnimationEvent,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";
import { Input } from "@/shared/ui/input";

/**
 * `Input` do design system + sincronização de autofill.
 *
 * Vive em `composite/` (e não em `primitives/`) porque NÃO é reexport: é um
 * wrapper com lógica. `primitives/` é o inventário do que o app usa do design
 * system, um arquivo por componente e uma linha por arquivo — misturar código
 * autoral ali apaga essa leitura.
 *
 * A lógica que justifica o wrapper: quando o navegador preenche o campo
 * sozinho, ele não dispara `change`. O `Input` do DS não trata isso, então o
 * formulário controlado ficava com o estado vazio enquanto a tela mostrava o
 * valor. O gancho é a animação `autofill-start` (e o `focus`, para o autofill
 * que só materializa na interação).
 */
type FormInputProps = InputHTMLAttributes<HTMLInputElement>;

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, type, onAnimationStart, onChange, onFocus, ...props }, ref) => {
    const shouldSyncAutofillValue = (
      event: AnimationEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>,
    ) => {
      if (props.value === undefined) return false;

      return event.currentTarget.value !== String(props.value ?? "");
    };

    const syncAutofillValue = (
      event: AnimationEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>,
    ) => {
      if (!onChange || !shouldSyncAutofillValue(event)) return;

      onChange(event as unknown as ChangeEvent<HTMLInputElement>);
    };

    return (
      <Input
        ref={ref}
        type={type}
        className={className}
        onAnimationStart={(event) => {
          onAnimationStart?.(event);

          if (event.animationName === "autofill-start") {
            syncAutofillValue(event);
          }
        }}
        onFocus={(event) => {
          onFocus?.(event);
          syncAutofillValue(event);
        }}
        onChange={onChange}
        {...props}
      />
    );
  },
);

FormInput.displayName = "FormInput";
