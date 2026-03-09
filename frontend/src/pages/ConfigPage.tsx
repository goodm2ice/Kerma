import { SimpleGrid, Stat, StatLabel, StatNumber } from "@chakra-ui/react";

import { SectionCard } from "../components/SectionCard";

export function ConfigPage({ config }: { config: Record<string, string | number> }) {
  return (
    <SectionCard title="Конфигурация" description="Текущие значения путей и параметров сканирования backend-сервиса.">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
        {Object.entries(config).map(([key, value]) => (
          <Stat key={key} p="4" bg="subtleBg" borderWidth="1px" borderColor="subtleBorder" borderRadius="2xl">
            <StatLabel textTransform="uppercase" fontSize="xs" letterSpacing="wider">
              {key}
            </StatLabel>
            <StatNumber fontSize="lg" wordBreak="break-word">
              {String(value)}
            </StatNumber>
          </Stat>
        ))}
      </SimpleGrid>
    </SectionCard>
  );
}
