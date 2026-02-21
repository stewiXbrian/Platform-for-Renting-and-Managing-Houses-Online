import { Box, Button, Group, PasswordInput, Stack, Text, TextInput, Title, Notification } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconCheck, IconLock, IconMail, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function SignUp({ setIsRegistered }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: "", color: "", icon: null });
  const [showVerification, setShowVerification] = useState(false);

  const form = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      verificationCode: "",
    },
    validate: {
      firstName: (value) => (showVerification ? null : value ? null : "First name is required"),
      lastName: (value) => (showVerification ? null : value ? null : "Last name is required"),
      email: (value) => (showVerification ? null : /^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (showVerification ? null : value.length < 8 ? "Password must be at least 8 characters" : null),
      confirmPassword: (value, values) =>
        showVerification ? null : value === values.password ? null : "Passwords do not match",
      verificationCode: (value) =>
        showVerification
          ? value.length !== 6
            ? "Verification code must be 6 characters"
            : null
          : null,
    },
  });

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setNotification({ message: "", color: "", icon: null });

    if (!showVerification) {
      // Signup phase: Send verification email
      try {
        const response = await fetch("http://localhost:5000/sendVerification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setNotification({
            message: result.error || "Failed to send verification email",
            color: "red",
            icon: <IconAlertCircle size={18} />,
          });
          return;
        }

        setShowVerification(true);
        setNotification({
          message: `A verification code was sent to ${values.email}. Please check your inbox.`,
          color: "teal",
          icon: <IconCheck size={18} />,
        });
      } catch (err) {
        setNotification({
          message: err.message || "Network error. Check if server is running.",
          color: "red",
          icon: <IconAlertCircle size={18} />,
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Verification phase: Submit verification code
      try {
        const response = await fetch("http://localhost:5000/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            token: values.verificationCode,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setNotification({
            message: result.error || "Invalid or incorrect verification code",
            color: "red",
            icon: <IconAlertCircle size={18} />,
          });
          return;
        }

        if (result.success) {
          localStorage.setItem("userId", result.userId);
          setNotification({
            message: "Verification successful! Redirecting to profile...",
            color: "teal",
            icon: <IconCheck size={18} />,
          });
          setTimeout(() => navigate("/editProfile"), 2000);
        }
      } catch (err) {
        setNotification({
          message: err.message || "Network error. Check if server is running.",
          color: "red",
          icon: <IconAlertCircle size={18} />,
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Box py="xl" px="md">
      <Stack gap="lg">
        <Title order={2} ta="center" c="#e8e6e3" mb="0.8rem">
          Create Your Account
        </Title>
        <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {notification.message && (
              <Notification
                icon={notification.icon}
                color={notification.color}
                title={notification.color === "red" ? "Error" : "Success"}
                onClose={() => setNotification({ message: "", color: "", icon: null })}
                mb="md"
              >
                {notification.message}
              </Notification>
            )}
            <TextInput
              c="#e8e6e3"
              label="First Name"
              placeholder="John"
              leftSection={<IconUser size="1rem" />}
              radius="md"
              required={!showVerification}
              disabled={showVerification}
              {...form.getInputProps("firstName")}
            />
            <TextInput
              c="#e8e6e3"
              label="Last Name"
              placeholder="Doe"
              leftSection={<IconUser size="1rem" />}
              radius="md"
              required={!showVerification}
              disabled={showVerification}
              {...form.getInputProps("lastName")}
            />
            <TextInput
              c="#e8e6e3"
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size="1rem" />}
              radius="md"
              required={!showVerification}
              disabled={showVerification}
              {...form.getInputProps("email")}
            />
            <PasswordInput
              c="#e8e6e3"
              label="Password"
              placeholder="••••••••"
              leftSection={<IconLock size="1rem" />}
              radius="md"
              required={!showVerification}
              disabled={showVerification}
              {...form.getInputProps("password")}
            />
            <PasswordInput
              c="#e8e6e3"
              label="Confirm Password"
              placeholder="••••••••"
              leftSection={<IconLock size="1rem" />}
              radius="md"
              required={!showVerification}
              disabled={showVerification}
              {...form.getInputProps("confirmPassword")}
            />
            <Button
              type="submit"
              radius="md"
              variant="default"
              loading={isSubmitting}
              disabled={isSubmitting || showVerification}
              styles={{ root: { fontSize: "1.2rem" } }}
              mt="lg"
            >
              Register
            </Button>
            {showVerification && (
              <>
                <TextInput
                  c="#e8e6e3"
                  label="Verification Code"
                  placeholder="Enter 6-character code"
                  radius="md"
                  required
                  maxLength={6}
                  {...form.getInputProps("verificationCode")}
                />
                <Button
                  type="submit"
                  radius="md"
                  variant="default"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  styles={{ root: { fontSize: "1.2rem" } }}
                >
                  Verify
                </Button>
              </>
            )}
          </Stack>
        </Box>
        <Group justify="center">
          <Text size="md" c="dimmed">Already have an account? </Text>
          <Button
            size="md"
            variant="transparent"
            ml="-1.8rem"
            onClick={() => setIsRegistered(true)}
          >
            Log in
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}