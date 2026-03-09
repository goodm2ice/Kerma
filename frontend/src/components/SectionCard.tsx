import { Box, type BoxProps, Heading, Text } from "@chakra-ui/react";

export function SectionCard({
  children,
  description,
  title,
  ...props
}: BoxProps & { title: string; description?: string }) {
  return (
    <Box bg="panelBg" borderWidth="1px" borderColor="panelBorder" borderRadius="3xl" boxShadow="sm" p="6" {...props}>
      <Heading size="md">{title}</Heading>
      {description ? (
        <Text mt="2" color="mutedText">
          {description}
        </Text>
      ) : null}
      <Box mt="6">{children}</Box>
    </Box>
  );
}
