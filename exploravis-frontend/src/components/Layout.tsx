// components/SimpleLayout.tsx
import { Flex, Container, Text, Box } from "@radix-ui/themes";
import type { ReactNode } from "react";
import SimpleNavbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

const SimpleLayout = ({ children }: LayoutProps) => {
  return (
    <Flex direction="column" minHeight="100vh">
      <SimpleNavbar />

      <Container size="1" p="1" style={{ flex: 2, width: "100%", backgroundColor: "transparent" }}>
        {children}
      </Container>

      {/* Simple Footer */}
      <Flex
        asChild
        align="center"
        justify="center"
        py="4"
        style={{
          backgroundColor: 'var(--gray-1)',
          borderTop: '1px solid var(--gray-6)',
          color: 'var(--gray-11)',
          fontSize: 14,
        }}
      >
        <footer>
          <Text size="2">
            © {new Date().getFullYear()} ExploraVis • Security Data Visualization
          </Text>
        </footer>
      </Flex>
    </Flex >
  );
};

export default SimpleLayout;
