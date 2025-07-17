// script.js
document.addEventListener('DOMContentLoaded', () => {
    const dateTimeSpan = document.getElementById('date-time');
    const temperatureSpan = document.getElementById('temperature');
    const personNameInput = document.getElementById('person-name');
    const priorityTypeSelect = document.getElementById('priority-type');
    const observationInput = document.getElementById('observation');
    const addButton = document.getElementById('add-button');
    const queueList = document.getElementById('queue');
    const resetButton = document.getElementById('reset-button');

    // --- Configuração do Supabase ---
    // Substitua 'SEU_URL_DO_PROJETO_SUPABASE' e 'SUA_CHAVE_ANON_PUBLIC_SUPABASE'
    // pelos valores reais do seu painel Supabase (Project Settings -> API).
    // Use a 'Project URL' e a chave 'anon (public)'. NUNCA use a 'service_role' key no frontend!
import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = 'https://rfhnghyqmdyiyicfqdti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaG5naHlxbWR1aXlpY2ZxZHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTA4NjUsImV4cCI6MjA2ODAyNjg2NX0._UKv8z0MIC96q4oMFU6vZkMCUUjolxf86LizMCaDtxo';
const supabaseKey = process.env.SUPABASE_ANON_KEY)
const supabase = createClient(supabaseUrl, supabaseKey)
    // ---------------------------------

    // Função para atualizar data, hora e temperatura (simulada)
    function updateDateTimeAndTemperature() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        dateTimeSpan.textContent = now.toLocaleDateString('pt-BR', options);

        const temperature = (Math.random() * (28 - 22) + 22).toFixed(1);
        temperatureSpan.textContent = `Temp: ${temperature}°C`;
    }

    // Adiciona o item à fila no DOM
    function addPersonToDOM(person) {
        const listItem = document.createElement('li');
        listItem.classList.add('queue-item', person.type);
        listItem.dataset.id = person.id; // Assume que o ID é gerado pelo Supabase

        // Supabase geralmente usa 'created_at' ou 'time_added' se você definiu
        const timeAdded = new Date(person.time_added || person.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const observationHtml = person.observation ? `<p class="queue-item-observation">${person.observation}</p>` : '';

        listItem.innerHTML = `
            <div class="queue-item-content">
                <div class="queue-item-info">
                    <span class="queue-item-name">${person.name}</span>
                    <span class="queue-item-time">Adicionado às: ${timeAdded}</span>
                    ${observationHtml}
                </div>
                <div class="queue-item-actions">
                    <button class="remove-button">Remover</button>
                </div>
            </div>
        `;
        queueList.appendChild(listItem);

        listItem.querySelector('.remove-button').addEventListener('click', () => {
            removePerson(person.id);
        });
    }

    // Renderiza todos os itens da fila buscando do Supabase
    async function renderQueue() {
        queueList.innerHTML = ''; // Limpa a lista antes de renderizar
        // Busca os dados ordenados pela posição
        const { data, error } = await supabase
            .from('queue_items') // Nome da sua tabela no Supabase
            .select('*')
            .order('position', { ascending: true }); // Ordena pela nova coluna 'position'

        if (error) {
            console.error('Erro ao carregar dados da fila:', error);
            alert('Erro ao carregar a fila. Verifique o console para mais detalhes.');
            return;
        }

        data.forEach(person => addPersonToDOM(person));
    }

    // Adiciona uma nova pessoa à fila no Supabase
    addButton.addEventListener('click', async () => {
        const name = personNameInput.value.trim();
        const type = priorityTypeSelect.value;
        const observation = observationInput.value.trim();

        if (name) {
            // Primeiro, determine a próxima posição. Busque a maior posição existente.
            const { data: maxPositionData, error: maxPositionError } = await supabase
                .from('queue_items')
                .select('position')
                .order('position', { ascending: false })
                .limit(1);

            if (maxPositionError) {
                console.error('Erro ao obter a posição máxima:', maxPositionError);
                alert('Erro ao adicionar pessoa à fila.');
                return;
            }

            // A posição é o valor máximo existente + 1, ou 0 se a tabela estiver vazia
            const nextPosition = maxPositionData.length > 0 && maxPositionData[0].position !== null ? maxPositionData[0].position + 1 : 0;

            const { data, error } = await supabase
                .from('queue_items') // Nome da sua tabela no Supabase
                .insert([
                    {
                        name: name,
                        type: type,
                        observation: observation,
                        position: nextPosition,
                        time_added: new Date().toISOString() // Adiciona o timestamp
                    }
                ])
                .select(); // Retorna o item inserido para adicionar ao DOM

            if (error) {
                console.error('Erro ao adicionar pessoa ao Supabase:', error);
                alert('Erro ao adicionar pessoa à fila. Verifique o console para mais detalhes.');
            } else {
                addPersonToDOM(data[0]); // data[0] contém o item inserido com o ID gerado pelo Supabase
                personNameInput.value = '';
                priorityTypeSelect.value = 'normal';
                observationInput.value = '';
            }
        } else {
            alert('Por favor, insira o nome da pessoa.');
        }
    });

    // Remove uma pessoa da fila no Supabase
    async function removePerson(id) {
        if (confirm('Tem certeza que deseja remover esta pessoa da fila?')) {
            const { error } = await supabase
                .from('queue_items') // Nome da sua tabela
                .delete()
                .eq('id', id); // 'eq' significa 'equal to' (igual a)

            if (error) {
                console.error('Erro ao remover pessoa do Supabase:', error);
                alert('Erro ao remover pessoa da fila. Verifique o console para mais detalhes.');
            } else {
                // Re-renderiza a fila para garantir que a ordem esteja correta após a remoção
                renderQueue();
            }
        }
    }

    // Zera a fila no Supabase (deleta todos os itens)
    resetButton.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja zerar a fila? Esta ação não pode ser desfeita.')) {
            const { error } = await supabase
                .from('queue_items') // Nome da sua tabela
                .delete()
                .neq('id', 'null'); // Deleta todos os itens onde o ID não é nulo (ou seja, todos)

            if (error) {
                console.error('Erro ao zerar a fila no Supabase:', error);
                alert('Erro ao zerar a fila. Verifique o console para mais detalhes.');
            } else {
                renderQueue(); // Limpa o DOM e o banco de dados
            }
        }
    });

    // Configuração do Dragula para reordenar
    dragula([queueList]).on('drop', async (el, target, source, sibling) => {
        const updatedQueueOrder = [];
        // Constrói um array com os IDs na nova ordem do DOM
        Array.from(queueList.children).forEach((item, index) => {
            updatedQueueOrder.push({
                id: item.dataset.id,
                position: index // A nova posição é o índice no DOM
            });
        });

        // Envia as atualizações de posição para o Supabase
        // Usamos Promise.all para esperar que todas as atualizações sejam concluídas
        const updates = updatedQueueOrder.map(item =>
            supabase
                .from('queue_items') // Nome da sua tabela
                .update({ position: item.position })
                .eq('id', item.id)
        );

        const results = await Promise.all(updates);
        const hasErrors = results.some(result => result.error);

        if (hasErrors) {
            console.error('Erro ao atualizar a ordem da fila no Supabase:', results);
            alert('Erro ao salvar a nova ordem da fila.');
            // Opcional: Re-renderizar para reverter à ordem anterior se houver erro
            renderQueue();
        } else {
            console.log('Ordem da fila atualizada no Supabase.');
            // Não precisamos chamar renderQueue aqui, pois o Dragula já moveu os elementos
        }
    });

    // Inicializa a exibição
    updateDateTimeAndTemperature();
    setInterval(updateDateTimeAndTemperature, 60000); // Atualiza a cada minuto
    renderQueue(); // Carrega a fila do Supabase ao iniciar a página
});
