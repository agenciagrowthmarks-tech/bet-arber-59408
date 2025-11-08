import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Send, TrendingUp, Activity } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function IAInsights() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Markinhos Analista 🤖, seu assistente de IA especializado em análise de apostas esportivas. Como posso ajudá-lo hoje?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user" as const, content: input },
      {
        role: "assistant" as const,
        content: "Esta funcionalidade de chat está em desenvolvimento. Em breve você poderá conversar com a IA para obter insights sobre as melhores oportunidades e estratégias de apostas.",
      },
    ];

    setMessages(newMessages);
    setInput("");
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Brain className="h-10 w-10 text-accent-neon" />
          <h1 className="text-3xl md:text-4xl font-bold">Análise em tempo real com Markinhos Analista 🤖</h1>
        </div>
        <p className="text-muted-foreground">
          Converse com a IA para obter insights e análises personalizadas sobre apostas esportivas
        </p>
        <Badge variant="outline" className="bg-accent-neon/10">🧪 Em desenvolvimento</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel esquerdo - Resumo de mercado */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent-neon" />
                Resumo de Mercado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Jogos monitorados</span>
                  <span className="text-2xl font-bold">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Casas ativas</span>
                  <span className="text-2xl font-bold">18</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Oportunidades detectadas</span>
                  <span className="text-2xl font-bold text-accent-neon">7</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent-neon" />
                  Top 3 Casas
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>bet365</span>
                    <Badge variant="outline" className="text-xs">+4.2%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Betfair</span>
                    <Badge variant="outline" className="text-xs">+3.8%</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pinnacle</span>
                    <Badge variant="outline" className="text-xs">+3.5%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Perguntas sugeridas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-2 px-3"
                size="sm"
                onClick={() => setInput("Quais as melhores oportunidades agora?")}
              >
                <span className="text-xs">Quais as melhores oportunidades agora?</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-2 px-3"
                size="sm"
                onClick={() => setInput("Quais casas têm maior variação de odds?")}
              >
                <span className="text-xs">Quais casas têm maior variação de odds?</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-2 px-3"
                size="sm"
                onClick={() => setInput("Como a IA calcula o risco nas apostas simuladas?")}
              >
                <span className="text-xs">Como a IA calcula o risco nas apostas simuladas?</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Painel direito - Chat com IA */}
        <Card className="lg:col-span-2 flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent-neon" />
              Chat com Markinhos Analista
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-accent-neon text-background"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua pergunta..."
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
