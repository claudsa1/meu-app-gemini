export interface Order {
  "Order ID": string;
  "Order Number": string;
  "Timestamp": string;
  "Estado": 'Pendente' | 'Em Produção' | 'Enviado' | 'Concluído';
  "Preço": string;
  "Item": string;
  "User ID": string;
  "Telefone"?: string;
  "Localidade"?: string;
  "PDF Link"?: string;
}
