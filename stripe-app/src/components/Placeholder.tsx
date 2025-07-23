import { Button, Box, Icon, Spinner } from "@stripe/ui-extension-sdk/ui";

export const Placeholder = ({step, title}: {step: string, title: string}) => {
  return (
    <Box
      css={{
        stack: "y",
        gap: "small",
        keyline: "neutral",
        borderRadius: "medium",
        padding: "medium",
      }}
    >
      <Box css={{ font: "subheading" }}>{step}</Box>
      <Box css={{ font: "heading" }}>
        {title}
      </Box>
    </Box>
  );
};
