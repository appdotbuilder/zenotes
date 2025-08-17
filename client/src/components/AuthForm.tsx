import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { LoginUserInput, CreateUserInput } from '../../../server/src/schema';

interface AuthFormProps {
  onLogin: (loginData: LoginUserInput) => Promise<void>;
  isLoading: boolean;
}

export function AuthForm({ onLogin, isLoading }: AuthFormProps) {
  const [loginData, setLoginData] = useState<LoginUserInput>({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<CreateUserInput>({
    email: '',
    username: '',
    password: ''
  });

  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await onLogin(loginData);
    } catch (error) {
      setError('Invalid email or password');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRegisterLoading(true);

    try {
      await trpc.createUser.mutate(registerData);
      // After successful registration, automatically log in
      await onLogin({
        email: registerData.email,
        password: registerData.password
      });
    } catch (error) {
      setError('Failed to create account. Email might already be in use.');
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <CardHeader className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700">
            <TabsTrigger 
              value="login"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="register"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <TabsContent value="login">
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <CardTitle className="text-xl text-center text-gray-800 dark:text-gray-200">
                Welcome Back! 🎉
              </CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Sign in to access your notes
              </CardDescription>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={loginData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <AlertDescription className="text-red-600 dark:text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
              >
                {isLoading ? 'Signing In...' : 'Sign In ✨'}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <CardTitle className="text-xl text-center text-gray-800 dark:text-gray-200">
                Join NoteFlow! 🚀
              </CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Create your account to get started
              </CardDescription>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={registerData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                />
                <Input
                  type="text"
                  placeholder="Username"
                  value={registerData.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                  }
                  required
                  minLength={3}
                  maxLength={50}
                  className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={registerData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={6}
                  className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <AlertDescription className="text-red-600 dark:text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                disabled={isRegisterLoading}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg"
              >
                {isRegisterLoading ? 'Creating Account...' : 'Create Account 🎨'}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}