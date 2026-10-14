import { useState } from "react";
import { api } from "./api";
import type { User, Page } from "./types";
import { dateTime, labels } from "./format";
import {
  AddButton,
  Badge,
  Field,
  Form,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  Table,
  useLoad,
} from "./ui";

export function UsersPage({ current }: { current: User }) {
  const [version, refresh] = useState(0),
    [adding, setAdding] = useState(false),
    [target, setTarget] = useState<User | null>(null);
  const result = useLoad<User[]>("/users", version);
  return (
    <>
      <PageTitle
        title="Usuários"
        subtitle="Controle quem pode acessar e operar o sistema."
      >
        <AddButton onClick={() => setAdding(true)}>Novo usuário</AddButton>
      </PageTitle>
      <section className="panel">
        {result.error && <Notice>{result.error}</Notice>}
        <Table
          headers={["Nome", "Usuário", "Perfil", "Situação", "Ações"]}
          loading={result.loading}
          empty={!result.data?.length}
        >
          {result.data?.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                {u.id === current.id && <small>Você</small>}
              </td>
              <td>{u.username}</td>
              <td>
                <Badge status={u.role} />
              </td>
              <td>
                <Badge status={u.active ? "active" : "inactive"} />
              </td>
              <td>
                {u.id !== current.id && (
                  <button onClick={() => setTarget(u)}>
                    {u.active ? "Desativar" : "Reativar"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </section>
      {adding && (
        <UserForm
          close={() => setAdding(false)}
          done={() => {
            setAdding(false);
            refresh(version + 1);
          }}
        />
      )}
      {target && (
        <Modal
          title={target.active ? "Desativar usuário" : "Reativar usuário"}
          close={() => setTarget(null)}
        >
          <Form
            submit="Confirmar"
            cancel={() => setTarget(null)}
            onSubmit={async () => {
              await api(`/users/${target.id}/toggle`, "POST");
              setTarget(null);
              refresh(version + 1);
            }}
          >
            <p>
              {target.name} ({target.username})
            </p>
            <p className="help">
              A desativação encerra as sessões existentes. Feche o caixa do
              usuário antes.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function UserForm({ close, done }: { close: () => void; done: () => void }) {
  const [name, setName] = useState(""),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [role, setRole] = useState("operator");
  return (
    <Modal title="Novo usuário" close={close}>
      <Form
        cancel={close}
        onSubmit={async () => {
          await api("/users", "POST", { name, username, password, role });
          done();
        }}
      >
        <div className="form-grid">
          <Field label="Nome *" span>
            <input
              required
              autoFocus
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Usuário *">
            <input
              required
              minLength={3}
              maxLength={80}
              pattern="[a-zA-Z0-9_.\-]+"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Perfil">
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="operator">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>
          <Field label="Senha *" span>
            <input
              required
              type="password"
              minLength={10}
              maxLength={200}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        <p className="help">
          Mínimo de 10 caracteres. Operadores acessam clientes, catálogo, suas
          vendas e seu caixa.
        </p>
      </Form>
    </Modal>
  );
}
type AuditRow = {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity: string;
  entity_id: number;
  created_at: string;
};
export function AuditPage() {
  const [page, setPage] = useState(1);
  const result = useLoad<Page<AuditRow>>(`/audit?page=${page}`);
  return (
    <>
      <PageTitle
        title="Histórico de operações"
        subtitle="Registro das ações de cadastro, venda, caixa e financeiro."
      />
      <section className="panel">
        {result.error && <Notice>{result.error}</Notice>}
        <Table
          headers={["Código", "Usuário", "Ação", "Registro", "Data"]}
          empty={!result.data?.items.length}
          loading={result.loading}
        >
          {result.data?.items.map((r) => (
            <tr key={r.id}>
              <td>#{r.id}</td>
              <td>
                {r.user_name}
                <small>#{r.user_id}</small>
              </td>
              <td>
                {(
                  {
                    open: "Abertura",
                    close: "Fechamento",
                    create: "Cadastro",
                    update: "Alteração",
                    login: "Entrada",
                    settle: "Quitação",
                    cancel: "Cancelamento",
                    finalize: "Finalização",
                    move: "Movimentação",
                    toggle: "Ativação / desativação",
                  } as Record<string, string>
                )[r.action] || r.action}
              </td>
              <td>
                {(r.entity === "cash" ? "Caixa" : labels[r.entity]) || r.entity}{" "}
                #{r.entity_id}
              </td>
              <td>{dateTime(r.created_at)}</td>
            </tr>
          ))}
        </Table>
        <Pagination data={result.data} onPage={setPage} />
      </section>
    </>
  );
}
