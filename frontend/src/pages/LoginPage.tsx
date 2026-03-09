import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text
} from "@chakra-ui/react";
import { type FormEvent, useState } from "react";

import type { AuthProviders } from "../api";

export function LoginPage({
  error,
  isLoading,
  providers,
  onLogin
}: {
  error: string;
  isLoading: boolean;
  providers: AuthProviders | null;
  onLogin: (login: string, password: string) => void | Promise<void>;
}) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    void onLogin(login, password);
  }

  return (
    <Box minH="100vh" bg="appBg" py={{ base: 10, lg: 16 }}>
      <Container maxW="lg">
        <Box bg="panelBg" borderWidth="1px" borderColor="panelBorder" borderRadius="3xl" boxShadow="sm" p={{ base: 6, lg: 8 }}>
          <Stack as="form" spacing="5" onSubmit={handleSubmit}>
            <Box>
              <Text fontSize="sm" textTransform="uppercase" letterSpacing="widest" color="orange.600" fontWeight="semibold">
                Kerma
              </Text>
              <Heading mt="2" size="lg">
                Вход в систему
              </Heading>
              <Text mt="3" color="mutedText">
                Используй локальную учётную запись или вход через корпоративный SSO.
              </Text>
            </Box>

            <FormControl isRequired>
              <FormLabel>Логин</FormLabel>
              <Input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Пароль</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </FormControl>

            {error ? (
              <Box bg="red.500" color="white" borderRadius="2xl" px="4" py="3">
                {error}
              </Box>
            ) : null}

            <Stack direction={{ base: "column", md: "row" }} spacing="3">
              <Button type="submit" colorScheme="orange" isLoading={isLoading} isDisabled={!providers?.password_enabled}>
                Войти
              </Button>
              {providers?.sso_enabled ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/api/auth/sso/login?next=${encodeURIComponent(window.location.href)}`;
                  }}
                >
                  {providers.sso_label}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
