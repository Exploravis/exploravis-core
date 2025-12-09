import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme appearance="light" accentColor="blue" grayColor="gray">
      {children}
    </Theme>
  );
}
