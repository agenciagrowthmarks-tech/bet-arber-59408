import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Relatorio() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Relatórios e Desempenho</h1>
        <p className="text-muted-foreground">
          Veja o histórico de oportunidades detectadas e as casas mais vantajosas segundo a IA.
        </p>
        <p className="text-xs text-muted-foreground">
          Análise automatizada – IA PegAI Odds.
        </p>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Em breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta funcionalidade está em desenvolvimento. Em breve você poderá visualizar 
              gráficos com "Oportunidades por dia" e "Casas mais lucrativas" identificadas pela IA.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
