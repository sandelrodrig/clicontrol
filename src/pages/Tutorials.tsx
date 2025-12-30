import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Play, Trash2, Edit, GripVertical, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function Tutorials() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Tutorial | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtube_url: ''
  });

  const { data: tutorials = [], isLoading } = useQuery({
    queryKey: ['tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as Tutorial[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; youtube_url: string }) => {
      const videoId = extractYouTubeId(data.youtube_url);
      if (!videoId) throw new Error('URL do YouTube inválida');
      
      const thumbnail_url = getYouTubeThumbnail(videoId);
      const order_index = tutorials.length;
      
      const { error } = await supabase
        .from('tutorials')
        .insert({
          title: data.title,
          description: data.description || null,
          youtube_url: data.youtube_url,
          thumbnail_url,
          order_index
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
      toast.success('Tutorial adicionado com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar tutorial');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title: string; description: string; youtube_url: string }) => {
      const videoId = extractYouTubeId(data.youtube_url);
      if (!videoId) throw new Error('URL do YouTube inválida');
      
      const thumbnail_url = getYouTubeThumbnail(videoId);
      
      const { error } = await supabase
        .from('tutorials')
        .update({
          title: data.title,
          description: data.description || null,
          youtube_url: data.youtube_url,
          thumbnail_url
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
      toast.success('Tutorial atualizado com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar tutorial');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tutorials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
      toast.success('Tutorial removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover tutorial');
    }
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', youtube_url: '' });
    setEditingTutorial(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.youtube_url.trim()) {
      toast.error('Preencha título e URL do vídeo');
      return;
    }

    if (editingTutorial) {
      updateMutation.mutate({ id: editingTutorial.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      description: tutorial.description || '',
      youtube_url: tutorial.youtube_url
    });
    setIsDialogOpen(true);
  };

  const handleOpenVideo = (tutorial: Tutorial) => {
    setSelectedVideo(tutorial);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Youtube className="h-7 w-7 text-red-500" />
            Tutoriais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aprenda a usar todas as funcionalidades do sistema
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Tutorial
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTutorial ? 'Editar Tutorial' : 'Novo Tutorial'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Como cadastrar um cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube_url">URL do YouTube *</Label>
                  <Input
                    id="youtube_url"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Breve descrição do conteúdo do vídeo"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTutorial ? 'Salvar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {selectedVideo && (
            <>
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(selectedVideo.youtube_url)}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">{selectedVideo.title}</h3>
                {selectedVideo.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedVideo.description}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tutorials Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <Card className="p-8 text-center">
          <Youtube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum tutorial disponível</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin 
              ? 'Adicione vídeos tutoriais para ajudar os vendedores a usar o sistema.'
              : 'Em breve teremos tutoriais disponíveis para você.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tutorials.map((tutorial) => {
            const videoId = extractYouTubeId(tutorial.youtube_url);
            return (
              <Card 
                key={tutorial.id} 
                className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => handleOpenVideo(tutorial)}
              >
                <div className="relative aspect-video bg-muted">
                  {tutorial.thumbnail_url ? (
                    <img
                      src={tutorial.thumbnail_url}
                      alt={tutorial.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Youtube className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                      <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2">{tutorial.title}</h3>
                  {tutorial.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {tutorial.description}
                    </p>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(tutorial)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(tutorial.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
