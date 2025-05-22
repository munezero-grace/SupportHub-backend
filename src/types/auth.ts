export interface SignupRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  provider?: string;
  providerId?: string;
}

export interface GoogleSignInBody {
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
  providerId: string;
}

export interface AuthPayload {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  provider?: string;
  providerId?: string;
}
