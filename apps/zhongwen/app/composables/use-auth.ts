import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient();

export const useAuth = () => {
  const session = authClient.useSession();
  const user = computed(() => session.value.data?.user ?? null);
  const isPending = computed(() => session.value.isPending);

  return { session, user, isPending };
};
