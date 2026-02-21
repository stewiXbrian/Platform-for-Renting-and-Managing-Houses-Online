import { Box, Button, Group, Modal, Paper, PasswordInput, Stack, Text, TextInput, Title,Checkbox } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconLock, IconMail } from "@tabler/icons-react";
import { useState } from "react";
import Login from './Login'
import SignUp from './SignUp'




export default function LoginSignUp() {
  const [isRegistered, setIsRegistered]= useState(true);

        return (
                <>
                    {
                      isRegistered ? 
                      <Login
                        setIsRegistered={setIsRegistered}
                      /> :
                       <SignUp
                        setIsRegistered={setIsRegistered}  

                       /> } 
                  </>
                       )
                              }








