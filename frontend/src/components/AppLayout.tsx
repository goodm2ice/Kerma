import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Spinner,
  Text,
  useColorMode,
  useColorModeValue
} from "@chakra-ui/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import type { AuthUser } from "../api";

type AppLayoutProps = {
  isLoading: boolean;
  onLogout: () => void | Promise<void>;
  onRescan: (target: "sources" | "editions") => void | Promise<void>;
  user: AuthUser;
};

const navItems = [
  { label: "Источники", to: "/" },
  { label: "Издания", to: "/editions" },
  { label: "Конфигурация", to: "/config" }
];

export function AppLayout({ isLoading, onLogout, onRescan, user }: AppLayoutProps) {
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();
  const navColorScheme = useColorModeValue("gray", "orange");

  return (
    <Box minH="100vh" bg="appBg">
      <Container maxW="8xl" py={{ base: 6, lg: 8 }}>
        <Flex direction="column" gap="6">
          <Box bg="panelBg" borderWidth="1px" borderColor="panelBorder" borderRadius="3xl" boxShadow="sm" p={{ base: 5, lg: 8 }}>
            <Flex justify="space-between" align={{ base: "start", lg: "center" }} direction={{ base: "column", lg: "row" }} gap="5">
              <Box>
                <Text fontSize="sm" textTransform="uppercase" letterSpacing="widest" color="orange.600" fontWeight="semibold">
                  Kerma
                </Text>
                <Heading mt="2" size="xl">
                  Управление библиотекой CBZ
                </Heading>
                <Text mt="3" maxW="3xl" color="mutedText">
                  Загрузка исходников, сборка архивов, просмотр содержимого изданий и редактирование ComicInfo.xml в одном интерфейсе.
                </Text>
              </Box>

              <Flex direction="column" align={{ base: "stretch", lg: "end" }} gap="3">
                <HStack wrap="wrap" justify={{ base: "start", lg: "end" }}>
                  <Text fontSize="sm" color="secondaryText">
                    {user.login} · {user.role} · {user.source}
                  </Text>
                  <Button variant="ghost" onClick={toggleColorMode}>
                    {colorMode === "light" ? "Темная тема" : "Светлая тема"}
                  </Button>
                  <Button colorScheme="orange" variant="outline" onClick={() => void onRescan("sources")}>
                    Пересканировать источники
                  </Button>
                  <Button colorScheme="blue" variant="outline" onClick={() => void onRescan("editions")}>
                    Пересканировать издания
                  </Button>
                  <Button variant="outline" onClick={() => void onLogout()}>
                    Выйти
                  </Button>
                </HStack>
                <HStack color="secondaryText" justify={{ base: "start", lg: "end" }}>
                  {isLoading ? <Spinner size="sm" /> : null}
                  <Text fontSize="sm">{isLoading ? "Загрузка данных..." : "Автоперескан каждые 30 секунд"}</Text>
                </HStack>
              </Flex>
            </Flex>
          </Box>

          <HStack spacing="3" wrap="wrap">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Button
                  as={NavLink}
                  key={item.to}
                  to={item.to}
                  colorScheme={active ? "orange" : navColorScheme}
                  variant={active ? "solid" : "outline"}
                  borderRadius="full"
                >
                  {item.label}
                </Button>
              );
            })}
          </HStack>

          <Outlet />
        </Flex>
      </Container>
    </Box>
  );
}
